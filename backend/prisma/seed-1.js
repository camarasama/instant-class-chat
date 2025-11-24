// backend/prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.user.deleteMany();

  // Create test instructor
  const instructorPassword = await bcrypt.hash('instructor123', 12);
  const instructor = await prisma.user.create({
    data: {
      username: 'professor_x',
      email: 'instructor@school.edu',
      password: instructorPassword,
      name: 'Professor Xavier',
      role: 'INSTRUCTOR',
      isVerified: true,
      indexNumber: 'INS001',
      phoneNumber: '+1234567890'
    },
  });

  // Create test student
  const studentPassword = await bcrypt.hash('student123', 12);
  const student = await prisma.user.create({
    data: {
      username: 'john_doe',
      email: 'student@school.edu',
      password: studentPassword,
      name: 'John Doe',
      role: 'STUDENT',
      isVerified: true,
      indexNumber: 'STU001',
      phoneNumber: '+1234567891'
    },
  });

  // Create another student
  const student2Password = await bcrypt.hash('student123', 12);
  const student2 = await prisma.user.create({
    data: {
      username: 'jane_smith',
      email: 'jane@school.edu',
      password: student2Password,
      name: 'Jane Smith',
      role: 'STUDENT',
      isVerified: true,
      indexNumber: 'STU002',
      phoneNumber: '+1234567892'
    },
  });

  // Create sample channels
  const mathChannel = await prisma.channel.create({
    data: {
      name: 'Mathematics 101',
      description: 'Discussion for Mathematics course - Algebra, Calculus, and more',
      members: {
        connect: [
          { id: instructor.id },
          { id: student.id },
          { id: student2.id }
        ]
      }
    },
  });

  const scienceChannel = await prisma.channel.create({
    data: {
      name: 'Science Lab',
      description: 'Science experiments, physics, chemistry discussions',
      members: {
        connect: [
          { id: instructor.id },
          { id: student.id }
        ]
      }
    },
  });

  const programmingChannel = await prisma.channel.create({
    data: {
      name: 'Programming Club',
      description: 'Web development, JavaScript, Node.js, and programming help',
      isPublic: true,
      members: {
        connect: [
          { id: student.id },
          { id: student2.id }
        ]
      }
    },
  });

  // Create some sample messages
  await prisma.message.create({
    data: {
      text: 'Welcome everyone to the Mathematics 101 channel!',
      authorId: instructor.id,
      channelId: mathChannel.id
    }
  });

  await prisma.message.create({
    data: {
      text: 'Thanks for having me! Looking forward to learning.',
      authorId: student.id,
      channelId: mathChannel.id
    }
  });

  await prisma.message.create({
    data: {
      text: 'Hello everyone! Ready for some math!',
      authorId: student2.id,
      channelId: mathChannel.id
    }
  });

  await prisma.message.create({
    data: {
      text: 'Welcome to the Science Lab channel. Our first experiment is next week.',
      authorId: instructor.id,
      channelId: scienceChannel.id
    }
  });

  console.log('✅ Seed data created:');
  console.log(`- Instructor: ${instructor.email} (password: instructor123)`);
  console.log(`- Student 1: ${student.email} (password: student123)`);
  console.log(`- Student 2: ${student2.email} (password: student123)`);
  console.log(`- Channels: ${mathChannel.name}, ${scienceChannel.name}, ${programmingChannel.name}`);
  console.log(`- Sample messages: 4 messages created`);
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Instructor: instructor@school.edu / instructor123');
  console.log('   Student: student@school.edu / student123');
  console.log('   Student 2: jane@school.edu / student123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });