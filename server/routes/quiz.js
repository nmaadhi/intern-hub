const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { verifyToken, requireRole } = require("../middleware/auth");
const Groq = require("groq-sdk");

let groq = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

async function generateQuizWithAI(topic, questionCount) {
  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Generate exactly ${questionCount} multiple choice questions about "${topic}" for beginner software engineering interns.

Rules:
- Each question must have exactly 4 options
- Exactly 1 option must be correct
- Keep questions SIMPLE and easy to understand
- Use plain English, avoid complex jargon
- Questions should test basic understanding, not advanced concepts
- Use real-world examples and analogies where possible
- Wrong options should be clearly wrong, not tricky
- Difficulty: very easy to easy (beginner level only)
- Return ONLY valid JSON, no markdown, no explanation

Format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": [
        { "text": "Option A text", "isCorrect": false },
        { "text": "Option B text", "isCorrect": true },
        { "text": "Option C text", "isCorrect": false },
        { "text": "Option D text", "isCorrect": false }
      ]
    }
  ]
}`,
      },
    ],
  });

  const text = response.choices[0].message.content;
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ════════════════════════════════════════════════════════════════════
// MENTOR ROUTES
// ════════════════════════════════════════════════════════════════════

router.post("/generate", verifyToken, requireRole("MENTOR"), async (req, res) => {
  try {
    const { topic, questionCount, cohortId } = req.body;
    if (!topic || !questionCount || !cohortId) {
      return res.status(400).json({ error: "topic, questionCount and cohortId are required" });
    }
    const count = parseInt(questionCount);
    if (count < 1 || count > 20) {
      return res.status(400).json({ error: "questionCount must be between 1 and 20" });
    }
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });
    if (cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: "You do not lead this cohort" });
    }
    const generated = await generateQuizWithAI(topic, count);
    res.json({ questions: generated.questions });
  } catch (err) {
    console.error("Error generating quiz:", err);
    res.status(500).json({ error: "Failed to generate quiz: " + err.message });
  }
});

router.post("/publish", verifyToken, requireRole("MENTOR"), async (req, res) => {
  try {
    const { topic, cohortId, questions, assignType, internIds } = req.body;
    if (!topic || !cohortId || !questions || questions.length === 0) {
      return res.status(400).json({ error: "topic, cohortId and questions are required" });
    }
    if (assignType === "DIRECT" && (!internIds || internIds.length === 0)) {
      return res.status(400).json({ error: "Select at least one intern for direct assignment" });
    }
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: "Cohort not found" });
    if (cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: "You do not lead this cohort" });
    }
    const quiz = await prisma.quiz.create({
      data: {
        topic: topic.trim(),
        status: "ACTIVE",
        assignType: assignType || "COHORT",
        cohortId,
        createdById: req.user.userId,
        questions: {
          create: questions.map((q, qi) => ({
            question: q.question,
            order: qi,
            options: {
              create: q.options.map((o, oi) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                order: oi,
              })),
            },
          })),
        },
        ...(assignType === "DIRECT" && internIds?.length > 0
          ? { recipients: { create: internIds.map((internId) => ({ internId })) } }
          : {}),
      },
      include: {
        questions: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        recipients: true,
      },
    });

    const io = req.app.get("io");
    if (assignType === "DIRECT" && internIds?.length > 0) {
      internIds.forEach((internId) => {
        io.to("user:" + internId).emit("quiz:new", {
          quizId: quiz.id,
          topic: quiz.topic,
          questionCount: quiz.questions.length,
        });
      });
    } else {
      io.to("cohort:" + cohortId).emit("quiz:new", {
        quizId: quiz.id,
        topic: quiz.topic,
        questionCount: quiz.questions.length,
      });
    }

    res.status(201).json({ message: "Quiz published", quiz });
  } catch (err) {
    console.error("Error publishing quiz:", err);
    res.status(500).json({ error: "Failed to publish quiz" });
  }
});

router.get("/", verifyToken, requireRole("MENTOR"), async (req, res) => {
  try {
    const { cohortId } = req.query;
    if (!cohortId) return res.status(400).json({ error: "cohortId required" });
    const quizzes = await prisma.quiz.findMany({
      where: { cohortId, createdById: req.user.userId },
      orderBy: { createdAt: "desc" },
      include: {
        questions: { select: { id: true } },
        attempts: { select: { internId: true, score: true, total: true } },
        recipients: { select: { internId: true } },
      },
    });
    const formatted = quizzes.map((q) => ({
      id: q.id,
      topic: q.topic,
      status: q.status,
      assignType: q.assignType,
      questionCount: q.questions.length,
      attemptCount: q.attempts.length,
      recipientCount: q.assignType === "DIRECT" ? q.recipients.length : null,
      avgScore: q.attempts.length > 0
        ? Math.round(q.attempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / q.attempts.length)
        : null,
      createdAt: q.createdAt,
    }));
    res.json({ quizzes: formatted });
  } catch (err) {
    console.error("Error listing quizzes:", err);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

router.get("/:id/results", verifyToken, requireRole("MENTOR"), async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        attempts: {
          include: {
            intern: { select: { id: true, name: true, internId: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        recipients: {
          include: {
            intern: { select: { id: true, name: true, internId: true } },
          },
        },
      },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    if (quiz.createdById !== req.user.userId) {
      return res.status(403).json({ error: "Not your quiz" });
    }
    res.json({ quiz });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

router.delete("/:id", verifyToken, requireRole("MENTOR"), async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    if (quiz.createdById !== req.user.userId) {
      return res.status(403).json({ error: "Not your quiz" });
    }
    await prisma.quiz.delete({ where: { id: req.params.id } });
    res.json({ message: "Quiz deleted" });
  } catch (err) {
    console.error("Error deleting quiz:", err);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

// ════════════════════════════════════════════════════════════════════
// INTERN ROUTES
// ════════════════════════════════════════════════════════════════════

router.get("/intern/list", verifyToken, requireRole("INTERN"), async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });
    if (!me?.cohortId) return res.json({ quizzes: [] });
    const quizzes = await prisma.quiz.findMany({
      where: {
        cohortId: me.cohortId,
        status: "ACTIVE",
        OR: [
          { assignType: "COHORT" },
          { assignType: "DIRECT", recipients: { some: { internId: req.user.userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        questions: { select: { id: true } },
        attempts: {
          where: { internId: req.user.userId },
          select: { score: true, total: true, createdAt: true },
        },
      },
    });
    const formatted = quizzes.map((q) => ({
      id: q.id,
      topic: q.topic,
      assignType: q.assignType,
      questionCount: q.questions.length,
      myAttempt: q.attempts[0] || null,
    }));
    res.json({ quizzes: formatted });
  } catch (err) {
    console.error("Error listing intern quizzes:", err);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});

router.get("/intern/:id", verifyToken, requireRole("INTERN"), async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          include: {
            options: {
              orderBy: { order: "asc" },
              select: { id: true, text: true, order: true },
            },
          },
          orderBy: { order: "asc" },
        },
        attempts: { where: { internId: req.user.userId } },
        recipients: { where: { internId: req.user.userId } },
      },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    if (quiz.cohortId !== me.cohortId) {
      return res.status(403).json({ error: "This quiz is not for your cohort" });
    }
    if (quiz.assignType === "DIRECT" && quiz.recipients.length === 0) {
      return res.status(403).json({ error: "You are not assigned to this quiz" });
    }
    res.json({
      quiz: { id: quiz.id, topic: quiz.topic, questions: quiz.questions },
      myAttempt: quiz.attempts[0] || null,
    });
  } catch (err) {
    console.error("Error fetching quiz:", err);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
});

router.post("/intern/:id/attempt", verifyToken, requireRole("INTERN"), async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: "Answers are required" });
    const existing = await prisma.quizAttempt.findUnique({
      where: { quizId_internId: { quizId: req.params.id, internId: req.user.userId } },
    });
    if (existing) return res.status(400).json({ error: "You already attempted this quiz" });
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          include: { options: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    if (quiz.status !== "ACTIVE") return res.status(400).json({ error: "Quiz is not active" });
    let score = 0;
    const results = quiz.questions.map((q) => {
      const selectedOptionId = answers[q.id];
      const correctOption = q.options.find((o) => o.isCorrect);
      const selectedOption = q.options.find((o) => o.id === selectedOptionId);
      const isCorrect = selectedOptionId === correctOption?.id;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        question: q.question,
        selectedOptionId,
        selectedOptionText: selectedOption?.text || "Not answered",
        correctOptionId: correctOption?.id,
        correctOptionText: correctOption?.text,
        isCorrect,
      };
    });
    await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        internId: req.user.userId,
        answers: results,
        score,
        total: quiz.questions.length,
      },
    });
    res.json({
      message: "Quiz submitted",
      score,
      total: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      results,
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
});

module.exports = router;
