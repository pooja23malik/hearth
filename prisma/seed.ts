import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/family_tasks?schema=public",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Hearth with sample family data...\n");

  // Create board
  const board = await prisma.board.create({
    data: {
      name: "Malik Family",
      timezone: "America/Los_Angeles",
    },
  });
  console.log(`Board: ${board.name} (token: ${board.invite_token})`);

  // Create members
  const pooja = await prisma.member.create({
    data: {
      board_id: board.id,
      name: "Pooja",
      avatar_color: "#2B8A8A",
      is_creator: true,
    },
  });

  const sukhi = await prisma.member.create({
    data: {
      board_id: board.id,
      name: "Sukhi",
      avatar_color: "#6B5B95",
    },
  });

  console.log(`Members: ${pooja.name}, ${sukhi.name}`);

  // Create tasks across categories
  const tasks = await Promise.all([
    // Home maintenance (recurring)
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Clean kitchen counters",
        category: "home_maintenance",
        recurrence_rule: "daily",
        preferred_time_of_day: "evening",
        next_due_date: new Date("2026-04-06"),
        assigned_to: pooja.id,
        created_by: pooja.id,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Vacuum living room",
        category: "home_maintenance",
        recurrence_rule: "weekly",
        preferred_time_of_day: "morning",
        next_due_date: new Date("2026-04-04"),
        assigned_to: sukhi.id,
        created_by: pooja.id,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Clean bathrooms",
        category: "home_maintenance",
        recurrence_rule: "weekly",
        preferred_time_of_day: "morning",
        next_due_date: new Date("2026-04-05"),
        assigned_to: pooja.id,
        created_by: pooja.id,
      },
    }),

    // Health
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Go for a walk",
        category: "health",
        recurrence_rule: "daily",
        preferred_time_of_day: "morning",
        next_due_date: new Date("2026-04-06"),
        created_by: pooja.id,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Schedule dentist appointments",
        category: "health",
        recurrence_rule: "every_6_months",
        next_due_date: new Date("2026-04-15"),
        assigned_to: pooja.id,
        created_by: pooja.id,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Meal prep for the week",
        category: "health",
        recurrence_rule: "weekly",
        preferred_time_of_day: "afternoon",
        next_due_date: new Date("2026-04-05"),
        assigned_to: sukhi.id,
        created_by: sukhi.id,
      },
    }),

    // Errands
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Grocery run",
        category: "errands",
        recurrence_rule: "weekly",
        preferred_time_of_day: "afternoon",
        next_due_date: new Date("2026-04-05"),
        assigned_to: sukhi.id,
        created_by: pooja.id,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Pick up dry cleaning",
        category: "errands",
        next_due_date: new Date("2026-04-03"),
        assigned_to: pooja.id,
        created_by: pooja.id,
      },
    }),

    // Personal
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Read for 30 minutes",
        category: "personal",
        recurrence_rule: "daily",
        preferred_time_of_day: "evening",
        next_due_date: new Date("2026-04-06"),
        created_by: pooja.id,
        assigned_to: pooja.id,
        is_personal: true,
      },
    }),
    prisma.task.create({
      data: {
        board_id: board.id,
        title: "Practice guitar",
        category: "personal",
        recurrence_rule: "weekly",
        preferred_time_of_day: "evening",
        next_due_date: new Date("2026-04-06"),
        created_by: sukhi.id,
        assigned_to: sukhi.id,
        is_personal: true,
      },
    }),
  ]);

  console.log(`Tasks: ${tasks.length} created`);

  // Create 3 weeks of completion history
  // Week 1: Mar 16-22 (3 weeks ago)
  // Week 2: Mar 23-29 (2 weeks ago)
  // Week 3: Mar 30 - Apr 5 (last week — this is what the digest shows)

  const completions: Array<{
    task_id: string;
    board_id: string;
    completed_by: string;
    completed_at: Date;
  }> = [];

  function addCompletion(taskIndex: number, memberId: string, date: string) {
    completions.push({
      task_id: tasks[taskIndex].id,
      board_id: board.id,
      completed_by: memberId,
      completed_at: new Date(date),
    });
  }

  // --- WEEK 1 (Mar 16-22): Good week overall ---
  // Kitchen counters (daily) — Pooja did 5 of 7
  for (const d of ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-20", "2026-03-22"]) {
    addCompletion(0, pooja.id, d);
  }
  // Vacuum — Sukhi
  addCompletion(1, sukhi.id, "2026-03-17");
  // Bathrooms — Pooja
  addCompletion(2, pooja.id, "2026-03-21");
  // Walk (daily) — only 2 of 7
  addCompletion(3, pooja.id, "2026-03-16");
  addCompletion(3, sukhi.id, "2026-03-19");
  // Meal prep — Sukhi
  addCompletion(5, sukhi.id, "2026-03-22");
  // Grocery — Sukhi
  addCompletion(6, sukhi.id, "2026-03-20");

  // --- WEEK 2 (Mar 23-29): Similar pattern ---
  for (const d of ["2026-03-23", "2026-03-24", "2026-03-25", "2026-03-27", "2026-03-28", "2026-03-29"]) {
    addCompletion(0, pooja.id, d);
  }
  addCompletion(1, sukhi.id, "2026-03-24");
  addCompletion(2, pooja.id, "2026-03-28");
  // Walk — still low: 2 of 7
  addCompletion(3, sukhi.id, "2026-03-23");
  addCompletion(3, pooja.id, "2026-03-26");
  addCompletion(5, sukhi.id, "2026-03-29");
  addCompletion(6, sukhi.id, "2026-03-27");
  // Reading — Pooja
  addCompletion(8, pooja.id, "2026-03-25");
  addCompletion(8, pooja.id, "2026-03-28");

  // --- WEEK 3 (Mar 30 - Apr 5): THIS IS THE DIGEST WEEK ---
  // Kitchen counters — Pooja did 6 of 7 (strong)
  for (const d of ["2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-04", "2026-04-05"]) {
    addCompletion(0, pooja.id, d);
  }
  // Vacuum — Sukhi
  addCompletion(1, sukhi.id, "2026-04-01");
  // Bathrooms — Pooja
  addCompletion(2, pooja.id, "2026-04-04");
  // Walk (daily) — only 2 of 7 again (health gap!)
  addCompletion(3, pooja.id, "2026-03-31");
  addCompletion(3, sukhi.id, "2026-04-03");
  // Meal prep — Sukhi
  addCompletion(5, sukhi.id, "2026-04-05");
  // Grocery — Sukhi
  addCompletion(6, sukhi.id, "2026-04-04");
  // Dry cleaning — Pooja
  addCompletion(7, pooja.id, "2026-04-03");
  // Reading — Pooja did 4 of 7
  for (const d of ["2026-03-30", "2026-04-01", "2026-04-03", "2026-04-05"]) {
    addCompletion(8, pooja.id, d);
  }
  // Guitar — Sukhi
  addCompletion(9, sukhi.id, "2026-04-02");

  await prisma.taskHistory.createMany({ data: completions });
  console.log(`Completions: ${completions.length} records across 3 weeks`);

  // Set family values
  await prisma.boardValue.createMany({
    data: [
      { board_id: board.id, name: "Clean home", category: "home_maintenance", priority: 1 },
      { board_id: board.id, name: "Health & wellness", category: "health", priority: 2 },
      { board_id: board.id, name: "Errands & logistics", category: "errands", priority: 3 },
      { board_id: board.id, name: "Personal growth", category: "personal", priority: 4 },
    ],
  });
  console.log("Values: 4 family values set");

  console.log(`\n--- DONE ---`);
  console.log(`Open: http://localhost:3000/board/${board.invite_token}`);
  console.log(`Select "Pooja" as your member, then tap the Digest tab.`);
  console.log(`\nExpected digest for Mar 30 - Apr 5:`);
  console.log(`  Clean home: ~85% (strong — 8 of ~9 tasks)`);
  console.log(`  Health: ~30% (gap! — 3 of ~9 tasks, walk barely done)`);
  console.log(`  Errands: ~100% (both tasks done)`);
  console.log(`  Personal: ~50% (5 of ~8)`);
  console.log(`  Pooja did most kitchen + personal tasks`);
  console.log(`  Sukhi handles groceries + meals`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
