import { PrismaClient, UserRole, ShiftStatus, AssignmentStatus, SwapStatus, DropStatus, NotificationType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

// Simple password hash for seeding (in production, bcrypt is used in the app)
// For seed data, we store a bcrypt-compatible hash of "password123"
// This is the bcrypt hash of "password123" with 10 rounds
const PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeTfmMdmN8eFKxR3xiDBAJqt.vWQw1.JW';

function cuid(): string {
  return crypto.randomBytes(12).toString('hex');
}

async function main() {
  console.log('🌱 Seeding ShiftSync database...\n');

  // Clean existing data
  await prisma.domainEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.dropRequest.deleteMany();
  await prisma.swapRequest.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.staffCertification.deleteMany();
  await prisma.managerLocation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();

  console.log('✅ Cleaned existing data\n');

  // ─── Locations ────────────────────────────────────────────────────
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        id: 'loc-downtown-sf',
        name: 'Downtown SF',
        address: '123 Market St, San Francisco, CA 94105',
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.location.create({
      data: {
        id: 'loc-marina-sf',
        name: 'Marina SF',
        address: '456 Chestnut St, San Francisco, CA 94123',
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.location.create({
      data: {
        id: 'loc-brooklyn-ny',
        name: 'Brooklyn Heights',
        address: '789 Atlantic Ave, Brooklyn, NY 11217',
        timezone: 'America/New_York',
      },
    }),
    prisma.location.create({
      data: {
        id: 'loc-manhattan-ny',
        name: 'Manhattan Midtown',
        address: '321 5th Ave, New York, NY 10016',
        timezone: 'America/New_York',
      },
    }),
  ]);
  console.log(`✅ Created ${locations.length} locations\n`);

  // ─── Admin ────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      id: 'user-admin',
      email: 'admin@coastaleats.com',
      passwordHash: PASSWORD_HASH,
      firstName: 'Alex',
      lastName: 'Rivera',
      role: UserRole.ADMIN,
      phone: '555-0100',
    },
  });
  console.log(`✅ Created admin: ${admin.email}`);

  // ─── Managers ─────────────────────────────────────────────────────
  const managerSf = await prisma.user.create({
    data: {
      id: 'user-mgr-sf',
      email: 'manager-sf@coastaleats.com',
      passwordHash: PASSWORD_HASH,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: UserRole.MANAGER,
      phone: '555-0201',
    },
  });
  await prisma.managerLocation.createMany({
    data: [
      { userId: managerSf.id, locationId: 'loc-downtown-sf' },
      { userId: managerSf.id, locationId: 'loc-marina-sf' },
    ],
  });

  const managerNy = await prisma.user.create({
    data: {
      id: 'user-mgr-ny',
      email: 'manager-ny@coastaleats.com',
      passwordHash: PASSWORD_HASH,
      firstName: 'Marcus',
      lastName: 'Johnson',
      role: UserRole.MANAGER,
      phone: '555-0202',
    },
  });
  await prisma.managerLocation.createMany({
    data: [
      { userId: managerNy.id, locationId: 'loc-brooklyn-ny' },
      { userId: managerNy.id, locationId: 'loc-manhattan-ny' },
    ],
  });

  const managerMulti = await prisma.user.create({
    data: {
      id: 'user-mgr-multi',
      email: 'manager-multi@coastaleats.com',
      passwordHash: PASSWORD_HASH,
      firstName: 'Jordan',
      lastName: 'Park',
      role: UserRole.MANAGER,
      phone: '555-0203',
    },
  });
  await prisma.managerLocation.createMany({
    data: [
      { userId: managerMulti.id, locationId: 'loc-brooklyn-ny' },
      { userId: managerMulti.id, locationId: 'loc-manhattan-ny' },
    ],
  });
  console.log('✅ Created 3 managers\n');

  // ─── Staff ────────────────────────────────────────────────────────
  const staffData = [
    { id: 'user-staff-01', email: 'emma.wilson@coastaleats.com', firstName: 'Emma', lastName: 'Wilson', skills: ['bartender', 'server'], locations: ['loc-downtown-sf', 'loc-marina-sf'], desired: 30 },
    { id: 'user-staff-02', email: 'liam.garcia@coastaleats.com', firstName: 'Liam', lastName: 'Garcia', skills: ['line_cook'], locations: ['loc-downtown-sf'], desired: 40 },
    { id: 'user-staff-03', email: 'olivia.brown@coastaleats.com', firstName: 'Olivia', lastName: 'Brown', skills: ['server', 'host'], locations: ['loc-downtown-sf', 'loc-marina-sf'], desired: 25 },
    { id: 'user-staff-04', email: 'noah.martinez@coastaleats.com', firstName: 'Noah', lastName: 'Martinez', skills: ['bartender'], locations: ['loc-marina-sf'], desired: 35 },
    { id: 'user-staff-05', email: 'ava.davis@coastaleats.com', firstName: 'Ava', lastName: 'Davis', skills: ['server'], locations: ['loc-downtown-sf'], desired: 20 },
    { id: 'user-staff-06', email: 'ethan.rodriguez@coastaleats.com', firstName: 'Ethan', lastName: 'Rodriguez', skills: ['line_cook', 'server'], locations: ['loc-downtown-sf', 'loc-marina-sf'], desired: 40 },
    { id: 'user-staff-07', email: 'sophia.lee@coastaleats.com', firstName: 'Sophia', lastName: 'Lee', skills: ['host', 'server'], locations: ['loc-marina-sf'], desired: 30 },
    { id: 'user-staff-08', email: 'mason.taylor@coastaleats.com', firstName: 'Mason', lastName: 'Taylor', skills: ['bartender', 'server'], locations: ['loc-brooklyn-ny', 'loc-manhattan-ny'], desired: 35 },
    { id: 'user-staff-09', email: 'isabella.anderson@coastaleats.com', firstName: 'Isabella', lastName: 'Anderson', skills: ['line_cook'], locations: ['loc-brooklyn-ny'], desired: 40 },
    { id: 'user-staff-10', email: 'william.thomas@coastaleats.com', firstName: 'William', lastName: 'Thomas', skills: ['server', 'host'], locations: ['loc-brooklyn-ny', 'loc-manhattan-ny'], desired: 30 },
    { id: 'user-staff-11', email: 'mia.jackson@coastaleats.com', firstName: 'Mia', lastName: 'Jackson', skills: ['bartender'], locations: ['loc-manhattan-ny'], desired: 25 },
    { id: 'user-staff-12', email: 'james.white@coastaleats.com', firstName: 'James', lastName: 'White', skills: ['server'], locations: ['loc-manhattan-ny', 'loc-brooklyn-ny'], desired: 35 },
    // Cross-timezone staff (for the timezone tangle scenario)
    { id: 'user-staff-13', email: 'charlotte.harris@coastaleats.com', firstName: 'Charlotte', lastName: 'Harris', skills: ['bartender', 'server'], locations: ['loc-downtown-sf', 'loc-brooklyn-ny'], desired: 30 },
    { id: 'user-staff-14', email: 'benjamin.clark@coastaleats.com', firstName: 'Benjamin', lastName: 'Clark', skills: ['line_cook', 'server'], locations: ['loc-marina-sf', 'loc-manhattan-ny'], desired: 40 },
    // High-hours staff (for overtime scenario)
    { id: 'user-staff-15', email: 'amelia.lewis@coastaleats.com', firstName: 'Amelia', lastName: 'Lewis', skills: ['server', 'host', 'bartender'], locations: ['loc-downtown-sf', 'loc-marina-sf'], desired: 40 },
    { id: 'user-staff-16', email: 'daniel.walker@coastaleats.com', firstName: 'Daniel', lastName: 'Walker', skills: ['line_cook', 'bartender'], locations: ['loc-brooklyn-ny', 'loc-manhattan-ny'], desired: 38 },
  ];

  for (const s of staffData) {
    await prisma.user.create({
      data: {
        id: s.id,
        email: s.email,
        passwordHash: PASSWORD_HASH,
        firstName: s.firstName,
        lastName: s.lastName,
        role: UserRole.STAFF,
        desiredWeeklyHours: s.desired,
      },
    });
    await prisma.staffSkill.createMany({
      data: s.skills.map((skill) => ({ userId: s.id, skill })),
    });
    await prisma.staffCertification.createMany({
      data: s.locations.map((loc) => ({ userId: s.id, locationId: loc })),
    });
    // Default availability: Mon-Fri 8am-10pm, Sat-Sun 10am-11pm
    const availabilities = [];
    for (let day = 1; day <= 5; day++) {
      availabilities.push({ userId: s.id, dayOfWeek: day, startTime: '08:00', endTime: '22:00', isRecurring: true, isAvailable: true });
    }
    availabilities.push({ userId: s.id, dayOfWeek: 6, startTime: '10:00', endTime: '23:00', isRecurring: true, isAvailable: true });
    availabilities.push({ userId: s.id, dayOfWeek: 0, startTime: '10:00', endTime: '23:00', isRecurring: true, isAvailable: true });
    await prisma.availability.createMany({ data: availabilities });
  }
  console.log(`✅ Created ${staffData.length} staff members with skills, certs, and availability\n`);

  // ─── Shifts ───────────────────────────────────────────────────────
  const now = new Date();
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  thisMonday.setUTCHours(0, 0, 0, 0);

  const nextMonday = new Date(thisMonday);
  nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);

  function shiftDate(weekStart: Date, dayOffset: number, hour: number, minute = 0): Date {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
  }

  const shiftsToCreate = [
    // THIS WEEK — Downtown SF (PUBLISHED)
    { id: 'shift-01', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 0, 9), end: shiftDate(thisMonday, 0, 17), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-02', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 0, 17), end: shiftDate(thisMonday, 1, 1), skill: 'bartender', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-03', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 1, 9), end: shiftDate(thisMonday, 1, 17), skill: 'line_cook', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-04', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 2, 11), end: shiftDate(thisMonday, 2, 19), skill: 'server', hc: 3, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-05', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 3, 9), end: shiftDate(thisMonday, 3, 17), skill: 'host', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-06', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 4, 17), end: shiftDate(thisMonday, 5, 1), skill: 'bartender', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday }, // Friday evening = PREMIUM
    { id: 'shift-07', loc: 'loc-downtown-sf', start: shiftDate(thisMonday, 5, 17), end: shiftDate(thisMonday, 6, 1), skill: 'server', hc: 3, status: ShiftStatus.PUBLISHED, week: thisMonday }, // Saturday evening = PREMIUM

    // THIS WEEK — Marina SF (PUBLISHED)
    { id: 'shift-08', loc: 'loc-marina-sf', start: shiftDate(thisMonday, 0, 10), end: shiftDate(thisMonday, 0, 18), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-09', loc: 'loc-marina-sf', start: shiftDate(thisMonday, 2, 10), end: shiftDate(thisMonday, 2, 18), skill: 'bartender', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-10', loc: 'loc-marina-sf', start: shiftDate(thisMonday, 4, 17), end: shiftDate(thisMonday, 5, 1), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },

    // THIS WEEK — Brooklyn NY (PUBLISHED)
    { id: 'shift-11', loc: 'loc-brooklyn-ny', start: shiftDate(thisMonday, 0, 12), end: shiftDate(thisMonday, 0, 20), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-12', loc: 'loc-brooklyn-ny', start: shiftDate(thisMonday, 1, 9), end: shiftDate(thisMonday, 1, 17), skill: 'line_cook', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-13', loc: 'loc-brooklyn-ny', start: shiftDate(thisMonday, 3, 16), end: shiftDate(thisMonday, 4, 0), skill: 'bartender', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-14', loc: 'loc-brooklyn-ny', start: shiftDate(thisMonday, 5, 18), end: shiftDate(thisMonday, 6, 2), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },

    // THIS WEEK — Manhattan NY (PUBLISHED)
    { id: 'shift-15', loc: 'loc-manhattan-ny', start: shiftDate(thisMonday, 0, 11), end: shiftDate(thisMonday, 0, 19), skill: 'host', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-16', loc: 'loc-manhattan-ny', start: shiftDate(thisMonday, 2, 9), end: shiftDate(thisMonday, 2, 17), skill: 'server', hc: 2, status: ShiftStatus.PUBLISHED, week: thisMonday },
    { id: 'shift-17', loc: 'loc-manhattan-ny', start: shiftDate(thisMonday, 4, 17), end: shiftDate(thisMonday, 5, 1), skill: 'bartender', hc: 1, status: ShiftStatus.PUBLISHED, week: thisMonday },

    // NEXT WEEK — Downtown SF (DRAFT — not yet published)
    { id: 'shift-18', loc: 'loc-downtown-sf', start: shiftDate(nextMonday, 0, 9), end: shiftDate(nextMonday, 0, 17), skill: 'server', hc: 2, status: ShiftStatus.DRAFT, week: nextMonday },
    { id: 'shift-19', loc: 'loc-downtown-sf', start: shiftDate(nextMonday, 1, 9), end: shiftDate(nextMonday, 1, 17), skill: 'line_cook', hc: 2, status: ShiftStatus.DRAFT, week: nextMonday },
    { id: 'shift-20', loc: 'loc-downtown-sf', start: shiftDate(nextMonday, 4, 17), end: shiftDate(nextMonday, 5, 1), skill: 'bartender', hc: 2, status: ShiftStatus.DRAFT, week: nextMonday },
  ];

  for (const s of shiftsToCreate) {
    await prisma.shift.create({
      data: {
        id: s.id,
        locationId: s.loc,
        startTime: s.start,
        endTime: s.end,
        requiredSkill: s.skill,
        headcount: s.hc,
        status: s.status,
        scheduleWeek: s.week,
        publishedAt: s.status === ShiftStatus.PUBLISHED ? new Date() : null,
      },
    });
  }
  console.log(`✅ Created ${shiftsToCreate.length} shifts\n`);

  // ─── Assignments ──────────────────────────────────────────────────
  const assignmentsToCreate = [
    // Downtown SF this week
    { shift: 'shift-01', user: 'user-staff-01', by: 'user-mgr-sf' },
    { shift: 'shift-01', user: 'user-staff-03', by: 'user-mgr-sf' },
    { shift: 'shift-02', user: 'user-staff-01', by: 'user-mgr-sf' }, // Emma works two shifts Monday
    { shift: 'shift-03', user: 'user-staff-02', by: 'user-mgr-sf' },
    { shift: 'shift-03', user: 'user-staff-06', by: 'user-mgr-sf' },
    { shift: 'shift-04', user: 'user-staff-03', by: 'user-mgr-sf' },
    { shift: 'shift-04', user: 'user-staff-05', by: 'user-mgr-sf' },
    { shift: 'shift-05', user: 'user-staff-03', by: 'user-mgr-sf' },
    { shift: 'shift-06', user: 'user-staff-01', by: 'user-mgr-sf' }, // Emma's Fri evening premium
    { shift: 'shift-06', user: 'user-staff-04', by: 'user-mgr-sf' },
    { shift: 'shift-07', user: 'user-staff-05', by: 'user-mgr-sf' },
    { shift: 'shift-07', user: 'user-staff-15', by: 'user-mgr-sf' }, // Amelia - high hours

    // Marina SF
    { shift: 'shift-08', user: 'user-staff-07', by: 'user-mgr-sf' },
    { shift: 'shift-09', user: 'user-staff-04', by: 'user-mgr-sf' },
    { shift: 'shift-10', user: 'user-staff-07', by: 'user-mgr-sf' },

    // Brooklyn NY
    { shift: 'shift-11', user: 'user-staff-10', by: 'user-mgr-ny' },
    { shift: 'shift-11', user: 'user-staff-12', by: 'user-mgr-ny' },
    { shift: 'shift-12', user: 'user-staff-09', by: 'user-mgr-ny' },
    { shift: 'shift-13', user: 'user-staff-08', by: 'user-mgr-ny' },
    { shift: 'shift-14', user: 'user-staff-10', by: 'user-mgr-ny' },
    { shift: 'shift-14', user: 'user-staff-12', by: 'user-mgr-ny' },

    // Manhattan NY
    { shift: 'shift-15', user: 'user-staff-10', by: 'user-mgr-ny' },
    { shift: 'shift-16', user: 'user-staff-12', by: 'user-mgr-ny' },
    { shift: 'shift-17', user: 'user-staff-11', by: 'user-mgr-ny' },

    // Amelia extra shifts to push near overtime (38+ hours)
    { shift: 'shift-01', user: 'user-staff-15', by: 'user-mgr-sf' },
    { shift: 'shift-04', user: 'user-staff-15', by: 'user-mgr-sf' },
    { shift: 'shift-08', user: 'user-staff-15', by: 'user-mgr-sf' },
  ];

  for (const a of assignmentsToCreate) {
    await prisma.assignment.create({
      data: {
        shiftId: a.shift,
        userId: a.user,
        assignedBy: a.by,
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }
  console.log(`✅ Created ${assignmentsToCreate.length} assignments\n`);

  // ─── Swap Request (pending) ──────────────────────────────────────
  await prisma.swapRequest.create({
    data: {
      id: 'swap-01',
      shiftId: 'shift-06',
      requesterId: 'user-staff-01', // Emma wants to swap Fri evening
      targetId: 'user-staff-04', // With Noah
      status: SwapStatus.PENDING_ACCEPTANCE,
    },
  });
  console.log('✅ Created 1 pending swap request\n');

  // ─── Drop Request (open) ─────────────────────────────────────────
  await prisma.dropRequest.create({
    data: {
      id: 'drop-01',
      shiftId: 'shift-07',
      requesterId: 'user-staff-05', // Ava wants to drop Sat evening
      status: DropStatus.OPEN,
      expiresAt: new Date(shiftsToCreate.find(s => s.id === 'shift-07')!.start.getTime() - 24 * 60 * 60 * 1000),
    },
  });
  console.log('✅ Created 1 open drop request\n');

  // ─── Notifications ────────────────────────────────────────────────
  const notifications = [
    { userId: 'user-staff-01', type: NotificationType.SCHEDULE_PUBLISHED, title: 'Schedule Published', message: 'This week\'s schedule for Downtown SF has been published.' },
    { userId: 'user-staff-01', type: NotificationType.SWAP_REQUEST_RECEIVED, title: 'Swap Request Sent', message: 'Your swap request for Friday evening shift has been sent to Noah.' },
    { userId: 'user-staff-04', type: NotificationType.SWAP_REQUEST_RECEIVED, title: 'Swap Request', message: 'Emma has requested to swap the Friday evening bartender shift with you.' },
    { userId: 'user-staff-05', type: NotificationType.SHIFT_ASSIGNED, title: 'New Shift Assigned', message: 'You have been assigned to Saturday evening server shift at Downtown SF.' },
    { userId: 'user-mgr-sf', type: NotificationType.OVERTIME_WARNING, title: 'Overtime Warning', message: 'Amelia Lewis is approaching 40 hours this week (currently at 38h).' },
  ];
  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }
  console.log(`✅ Created ${notifications.length} notifications\n`);

  // ─── Notification Preferences ─────────────────────────────────────
  for (const user of [admin, managerSf, managerNy, ...staffData.map(s => ({ id: s.id }))]) {
    await prisma.notificationPreference.create({
      data: { userId: user.id, inApp: true, email: false },
    });
  }

  // ─── Domain Events (sample audit trail) ───────────────────────────
  const events = [
    { aggregateId: 'shift-01', aggregateType: 'Shift', eventType: 'ShiftCreated', version: 1, payload: { locationId: 'loc-downtown-sf', requiredSkill: 'server', headcount: 2 }, metadata: { userId: 'user-mgr-sf' } },
    { aggregateId: 'shift-01', aggregateType: 'Shift', eventType: 'StaffAssigned', version: 2, payload: { userId: 'user-staff-01', assignedBy: 'user-mgr-sf' }, metadata: { userId: 'user-mgr-sf' } },
    { aggregateId: 'shift-01', aggregateType: 'Shift', eventType: 'StaffAssigned', version: 3, payload: { userId: 'user-staff-03', assignedBy: 'user-mgr-sf' }, metadata: { userId: 'user-mgr-sf' } },
    { aggregateId: 'shift-01', aggregateType: 'Shift', eventType: 'ShiftPublished', version: 4, payload: { publishedAt: new Date().toISOString() }, metadata: { userId: 'user-mgr-sf' } },
    { aggregateId: 'swap-01', aggregateType: 'SwapRequest', eventType: 'SwapRequested', version: 1, payload: { shiftId: 'shift-06', requesterId: 'user-staff-01', targetId: 'user-staff-04' }, metadata: { userId: 'user-staff-01' } },
  ];
  for (const e of events) {
    await prisma.domainEvent.create({ data: e });
  }
  console.log(`✅ Created ${events.length} domain events (audit trail)\n`);

  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 Seed complete! Login credentials:');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  Admin:   admin@coastaleats.com / password123');
  console.log('  Manager: manager-sf@coastaleats.com / password123');
  console.log('  Manager: manager-ny@coastaleats.com / password123');
  console.log('  Manager: manager-multi@coastaleats.com / password123');
  console.log('  Staff:   emma.wilson@coastaleats.com / password123');
  console.log('  Staff:   liam.garcia@coastaleats.com / password123');
  console.log('  (All staff use password123)');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
