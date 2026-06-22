// server/routes/admin.js
const express = require('express');
const router = express.Router();

const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');
const { generateTempPassword } = require('../utils/generateTempPassword');
const { generateInternId } = require('../utils/generateInternId');
const { generateToken } = require('../utils/generateToken');
const { sendMentorWelcome, sendInternWelcome } = require('../utils/email');
const { validateEmail } = require('../utils/validateEmail');

router.use(verifyToken);
router.use(requireRole('ADMIN'));

router.get('/ping', (req, res) => {
  res.json({ message: 'Admin route is alive' });
});

// ════════════════════════════════════════════════════════════════════
// MENTORS
// ════════════════════════════════════════════════════════════════════

router.post('/mentors', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : null;

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be 2 to 100 characters' });
    }

    const emailCheck = await validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.reason });
    }
    const normalizedEmail = emailCheck.normalized;

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    if (trimmedPhone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: trimmedPhone } });
      if (existingPhone) {
        return res.status(409).json({ error: 'A user with this phone number already exists' });
      }
    }

    const tempPassword = generateTempPassword(12);
    const hashedPassword = await hashPassword(tempPassword);

    const mentor = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        password: hashedPassword,
        role: 'MENTOR',
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, status: true, mustChangePassword: true, createdAt: true,
      },
    });

    // Setup token — valid for 1 hour
    const setupToken = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: mentor.id,
        token: setupToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    let emailSent = false;
    let emailError = null;
    try {
      await sendMentorWelcome({
        name: mentor.name,
        email: mentor.email,
        tempPassword,
        setupToken,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      console.error('⚠️  Email send failed:', err.message);
    }

    res.status(201).json({
      message: 'Mentor created successfully',
      mentor,
      emailSent,
      ...(emailSent ? {} : { tempPassword, emailError, _note: 'Email failed — share password manually' }),
    });
  } catch (err) {
    console.error('💥 Error creating mentor:', err);
    res.status(500).json({ error: 'Failed to create mentor' });
  }
});

router.get('/mentors', async (req, res) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, status: true,
        mustChangePassword: true, createdAt: true,
        _count: { select: { ledCohorts: true } },
      },
    });

    const formatted = mentors.map((m) => ({
      id: m.id, name: m.name, email: m.email, phone: m.phone,
      status: m.status, mustChangePassword: m.mustChangePassword,
      createdAt: m.createdAt, cohortCount: m._count.ledCohorts,
    }));

    res.json({ count: formatted.length, mentors: formatted });
  } catch (err) {
    console.error('💥 Error listing mentors:', err);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

router.delete('/mentors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await prisma.user.findUnique({ where: { id } });
    if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
    if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'User is not a mentor' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Mentor deleted successfully' });
  } catch (err) {
    console.error('💥 Error deleting mentor:', err);
    res.status(500).json({ error: 'Failed to delete mentor' });
  }
});

// ════════════════════════════════════════════════════════════════════
// COHORTS
// ════════════════════════════════════════════════════════════════════

router.post('/cohorts', async (req, res) => {
  try {
    const { name, description, startDate, endDate, mentorId } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ error: 'Name and startDate are required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be 2 to 100 characters' });
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startDate' });

    let end = null;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid endDate' });
      if (end <= start) return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const existing = await prisma.cohort.findUnique({ where: { name: trimmedName } });
    if (existing) return res.status(409).json({ error: 'A cohort with this name already exists' });

    if (mentorId) {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
      if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'Selected user is not a mentor' });
      if (mentor.status !== 'ACTIVE') return res.status(400).json({ error: 'Cannot assign an inactive mentor' });
    }

    const cohort = await prisma.cohort.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        startDate: start,
        endDate: end,
        status: 'ACTIVE',
        mentorId: mentorId || null,
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ message: 'Cohort created successfully', cohort });
  } catch (err) {
    console.error('💥 Error creating cohort:', err);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

router.get('/cohorts', async (req, res) => {
  try {
    const cohorts = await prisma.cohort.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        _count: { select: { interns: true } },
      },
    });

    const formatted = cohorts.map((c) => ({
      id: c.id, name: c.name, description: c.description,
      startDate: c.startDate, endDate: c.endDate, status: c.status,
      createdAt: c.createdAt, mentor: c.mentor,
      internCount: c._count.interns,
    }));

    res.json({ count: formatted.length, cohorts: formatted });
  } catch (err) {
    console.error('💥 Error listing cohorts:', err);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

router.patch('/cohorts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status, mentorId } = req.body;

    const cohort = await prisma.cohort.findUnique({ where: { id } });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const updateData = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ error: 'Name must be 2 to 100 characters' });
      }
      const dup = await prisma.cohort.findUnique({ where: { name: trimmedName } });
      if (dup && dup.id !== id) return res.status(409).json({ error: 'Another cohort already has this name' });
      updateData.name = trimmedName;
    }

    if (description !== undefined) updateData.description = description ? description.trim() : null;

    if (startDate !== undefined) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startDate' });
      updateData.startDate = start;
    }

    if (endDate !== undefined) {
      if (!endDate) { updateData.endDate = null; }
      else {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid endDate' });
        updateData.endDate = end;
      }
    }

    if (status !== undefined) {
      if (!['ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateData.status = status;
    }

    if (mentorId !== undefined) {
      if (!mentorId) { updateData.mentorId = null; }
      else {
        const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
        if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
        if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'Selected user is not a mentor' });
        if (mentor.status !== 'ACTIVE') return res.status(400).json({ error: 'Cannot assign an inactive mentor' });
        updateData.mentorId = mentorId;
      }
    }

    const updated = await prisma.cohort.update({
      where: { id },
      data: updateData,
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        _count: { select: { interns: true } },
      },
    });

    res.json({
      message: 'Cohort updated successfully',
      cohort: {
        id: updated.id, name: updated.name, description: updated.description,
        startDate: updated.startDate, endDate: updated.endDate, status: updated.status,
        mentor: updated.mentor, internCount: updated._count.interns,
      },
    });
  } catch (err) {
    console.error('💥 Error updating cohort:', err);
    res.status(500).json({ error: 'Failed to update cohort' });
  }
});

// ════════════════════════════════════════════════════════════════════
// INTERNS
// ════════════════════════════════════════════════════════════════════

router.post('/interns', async (req, res) => {
  try {
    const { name, email, phone, dob, college, cohortId, mentorId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedCollege = college ? college.trim() : null;

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be 2 to 100 characters' });
    }

    const emailCheck = await validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.reason });
    }
    const normalizedEmail = emailCheck.normalized;

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    if (trimmedPhone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: trimmedPhone } });
      if (existingPhone) {
        return res.status(409).json({ error: 'A user with this phone number already exists' });
      }
    }

    let parsedDob = null;
    if (dob) {
      parsedDob = new Date(dob);
      if (isNaN(parsedDob.getTime())) return res.status(400).json({ error: 'Invalid date of birth' });
      const age = (Date.now() - parsedDob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 14 || age > 100) return res.status(400).json({ error: 'Date of birth seems incorrect' });
    }

    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
      if (cohort.status !== 'ACTIVE') return res.status(400).json({ error: `Cannot assign to a ${cohort.status} cohort` });
    }

    if (mentorId) {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
      if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'Selected user is not a mentor' });
      if (mentor.status !== 'ACTIVE') return res.status(400).json({ error: 'Cannot assign an inactive mentor' });
    }

    const internId = await generateInternId();
    const tempPassword = generateTempPassword(12);
    const hashedPassword = await hashPassword(tempPassword);

    const intern = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: trimmedPhone,
        dob: parsedDob,
        college: trimmedCollege,
        internId,
        password: hashedPassword,
        role: 'INTERN',
        status: 'ACTIVE',
        mustChangePassword: true,
        cohortId: cohortId || null,
        mentorId: mentorId || null,
      },
      select: {
        id: true, name: true, email: true, phone: true, dob: true, college: true,
        internId: true, role: true, status: true, mustChangePassword: true, createdAt: true,
        cohort: { select: { id: true, name: true } },
        mentor: { select: { id: true, name: true, email: true } },
      },
    });

    // Setup token — valid for 1 hour
    const setupToken = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: intern.id,
        token: setupToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    let emailSent = false;
    let emailError = null;
    try {
      await sendInternWelcome({
        name: intern.name,
        email: intern.email,
        internId,
        tempPassword,
        setupToken,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      console.error('⚠️  Email send failed:', err.message);
    }

    res.status(201).json({
      message: 'Intern created successfully',
      intern,
      emailSent,
      ...(emailSent ? {} : { tempPassword, emailError, _note: 'Email failed — share password manually' }),
    });
  } catch (err) {
    console.error('💥 Error creating intern:', err);
    res.status(500).json({ error: 'Failed to create intern' });
  }
});

router.get('/interns', async (req, res) => {
  try {
    const interns = await prisma.user.findMany({
      where: { role: 'INTERN' },
      orderBy: { internId: 'asc' },
      select: {
        id: true, name: true, email: true, phone: true, dob: true, college: true,
        internId: true, status: true, mustChangePassword: true, createdAt: true,
        cohort: {
          select: {
            id: true, name: true,
            mentor: { select: { id: true, name: true, email: true } },
          },
        },
        mentor: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ count: interns.length, interns });
  } catch (err) {
    console.error('💥 Error listing interns:', err);
    res.status(500).json({ error: 'Failed to fetch interns' });
  }
});

router.patch('/interns/:id/cohort', async (req, res) => {
  try {
    const { id } = req.params;
    const { cohortId } = req.body;

    const intern = await prisma.user.findUnique({ where: { id } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ error: 'That user is not an intern' });

    let newCohortId = null;
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
      if (cohort.status !== 'ACTIVE') return res.status(400).json({ error: `Cannot assign to a ${cohort.status} cohort` });
      newCohortId = cohortId;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { cohortId: newCohortId },
      select: {
        id: true, name: true, internId: true,
        cohort: {
          select: {
            id: true, name: true,
            mentor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    res.json({
      message: newCohortId ? 'Intern assigned to cohort' : 'Intern removed from cohort',
      intern: updated,
    });
  } catch (err) {
    console.error('💥 Error assigning intern to cohort:', err);
    res.status(500).json({ error: 'Failed to update intern cohort' });
  }
});

router.patch('/interns/:id/mentor', async (req, res) => {
  try {
    const { id } = req.params;
    const { mentorId } = req.body;

    const intern = await prisma.user.findUnique({ where: { id } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ error: 'That user is not an intern' });

    let newMentorId = null;
    if (mentorId) {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (!mentor) return res.status(404).json({ error: 'Mentor not found' });
      if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'Selected user is not a mentor' });
      if (mentor.status !== 'ACTIVE') return res.status(400).json({ error: 'Cannot assign an inactive mentor' });
      newMentorId = mentorId;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { mentorId: newMentorId },
      select: {
        id: true, name: true, internId: true,
        mentor: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      message: newMentorId ? 'Mentor assigned to intern' : 'Mentor removed from intern',
      intern: updated,
    });
  } catch (err) {
    console.error('💥 Error assigning mentor to intern:', err);
    res.status(500).json({ error: 'Failed to update intern mentor' });
  }
});

router.delete('/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const intern = await prisma.user.findUnique({ where: { id } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ error: 'User is not an intern' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Intern deleted successfully' });
  } catch (err) {
    console.error('💥 Error deleting intern:', err);
    res.status(500).json({ error: 'Failed to delete intern' });
  }
});

module.exports = router;