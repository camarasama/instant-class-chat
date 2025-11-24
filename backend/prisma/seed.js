// prisma/seed.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with school registry data...');

  // Clear existing data
  await prisma.schoolRegistry.deleteMany();

  // Insert school registry data
  const schoolData = [
    {
      id: 'cls1',
      email: 'souleymane.camara@st.rmu.edu.gh',
      indexNumber: 'BIT1007326',
      fullName: 'Souleymane CAMARA',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls2', 
      email: 'kofi.aboagye@st.rmu.edu.gh',
      indexNumber: 'BIT10012824',
      fullName: 'Kofi Aboagye',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls3',
      email: 'joseph.asamani@st.rmu.edu.gh',
      indexNumber: 'BIT0005126',
      fullName: 'Joseph Asamani',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls4',
      email: 'maxpella.geraldo@st.rmu.edu.gh',
      indexNumber: 'BIT1001725',
      fullName: 'Maxpella Geraldo',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls5',
      email: 'hubi.martin@st.rmu.edu.gh',
      indexNumber: 'BIT0000626',
      fullName: 'Hubi Martin',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls6',
      email: 'samuel.odoomnyarko@st.rmu.edu.gh',
      indexNumber: 'BIT1278024',
      fullName: 'Samuel Odoom Nyarko',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls7',
      email: 'joana.obeng@st.rmu.edu.gh',
      indexNumber: 'BIT1046026',
      fullName: 'Joana Obeng',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls8',
      email: 'abrokwah.owusu@st.rmu.edu.gh',
      indexNumber: 'BIT0001026',
      fullName: 'Abrokwah Brian Owusu',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls9',
      email: 'nav.owusu-kyere@st.rmu.edu.gh',
      indexNumber: 'BIT0002026',
      fullName: 'Nav Owusu-Kyere',
      role: 'student',
      isActive: true
    },
    {
      id: 'cls10',
      email: 'francis.anlimah@rmu.edu.gh',
      indexNumber: 'LEC002',
      fullName: 'Francis Anlimah',
      role: 'lecturer',
      isActive: true
    },
    {
      id: 'cls11',
      email: 'camarasama@gmail.com',
      indexNumber: 'ADM001',
      fullName: 'Admin Office',
      role: 'admin',
      isActive: true
    },
    {
      id: 'cls12',
      email: 'immanuel.agbemabiase@st.rmu.edu.gh',
      indexNumber: 'BIT0006126',
      fullName: 'Immanuel Agbemabiase',
      role: 'class_rep',
      isActive: true
    }
  ];

  await prisma.schoolRegistry.createMany({
    data: schoolData,
    skipDuplicates: true,
  });

  console.log('✅ School registry seeded successfully!');
  console.log(`📊 Added ${schoolData.length} records to school registry`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });