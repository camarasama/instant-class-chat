-- backend/database/sample_data/001_sample_school_registry.sql
-- Updated to match Prisma schema
INSERT INTO school_registry (id, email, index_number, full_name, role, is_active) VALUES
('cls1', 'souleymane.camara@st.rmu.edu.gh', 'BIT1007326', 'Souleymane CAMARA', 'student', true),
('cls2', 'kofi.aboagye@st.rmu.edu.gh', 'BIT10012824', 'Kofi Aboagye', 'student', true),
('cls3', 'joseph.asamani@st.rmu.edu.gh', 'BIT0005126', 'Joseph Asamani', 'student', true),
('cls4', 'maxpella.geraldo@st.rmu.edu.gh', 'BIT1001725', 'Maxpella Geraldo', 'student', true),
('cls5', 'hubi.martin@st.rmu.edu.gh', 'BIT0000626', 'Hubi Martin', 'student', true),
('cls6', 'samuel.odoomnyarko@st.rmu.edu.gh', 'BIT1278024', 'Samuel Odoom Nyarko', 'student', true),
('cls7', 'joana.obeng@st.rmu.edu.gh', 'BIT1046026', 'Joana Obeng', 'student', true),
('cls8', 'abrokwah.owusu@st.rmu.edu.gh', 'BIT0001026', 'Abrokwah Brian Owusu', 'student', true),
('cls9', 'nav.owusu-kyere@st.rmu.edu.gh', 'BIT0002026', 'Nav Owusu-Kyere', 'student', true),
('cls10', 'francis.anlimah@rmu.edu.gh', 'LEC002', 'Francis Anlimah', 'lecturer', true),
('cls11', 'camarasama@gmail.com', 'ADM001', 'Admin Office', 'admin', true),
('cls12', 'immanuel.agbemabiase@st.rmu.edu.gh', 'BIT0006126', 'Immanuel Agbemabiase', 'class_rep', true);