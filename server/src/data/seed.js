// Seed data for the UTM Engagement Platform
// This mimics the mock data from the original code snippet

const INITIAL_EVENTS = [
  {
    id: 1,
    title: "Tech Innovation Summit 2025",
    date: "2025-04-15",
    time: "09:00",
    status: "approved",
    type: "Workshop",
    category: "Academic",
    proposer: "Tech Corp Ltd",
    proposerId: "EXT_999",
    proposerRole: "stakeholder",
    location: "UTM Auditorium",
    attendees: 0,
    registrations: [],
    capacity: 200,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000",
    description: "Join leading tech innovators for a day of workshops, keynote speeches, and networking. Explore the future of AI and sustainable tech in Mauritius.",
    tags: ["Technology", "Innovation", "Networking"],
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Career Fair 2025",
    date: "2025-04-05",
    time: "10:00",
    status: "approved",
    type: "Career",
    category: "Academic",
    proposer: "Career Services",
    proposerId: "STAFF_001",
    proposerRole: "admin",
    location: "Main Hall",
    attendees: 0,
    registrations: [],
    capacity: 500,
    image: "https://images.unsplash.com/photo-1560439514-4e9645039924?auto=format&fit=crop&q=80&w=1000",
    description: "Meet with top employers from Mauritius and abroad. Over 50 companies will be recruiting for internships, graduate positions, and full-time roles.",
    tags: ["Career", "Jobs", "Recruitment"],
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: "Community Beach Cleanup",
    date: "2025-03-10",
    time: "08:00",
    status: "approved",
    type: "Community Service",
    category: "Volunteering",
    proposer: "Student Union",
    proposerId: "230325359",
    proposerRole: "student",
    location: "Flic en Flac",
    attendees: 0,
    registrations: [],
    capacity: 50,
    image: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&q=80&w=1000",
    description: "Help us keep our island beautiful! Join the Student Union for a morning of cleaning up Flic en Flac beach. Transport provided.",
    tags: ["Environment", "Community", "Volunteering"],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_COMMITTEES = [
  {
    _id: "1",
    id: 1,
    name: "Sustainability Committee",
    memberCount: 2,
    membersCount: 2,
    nextMeeting: "2025-03-01",
    description: "Focused on implementing green initiatives across the UTM campus.",
    category: "environment",
    banner: "bg-green-600",
    status: 'active',
    creatorRole: 'admin',
    creatorId: 'STAFF_001',
    leader: "Dr. A. Ramgoolam",
    documents: [
      {
        id: "doc1",
        name: "Sustainability Action Plan 2025.pdf",
        size: "2.4 MB",
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "STAFF_001"
      },
      {
        id: "doc2",
        name: "Green Campus Guidelines.docx",
        size: "850 KB",
        uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "STAFF_001"
      }
    ],
    meetings: [
      {
        id: "meet1",
        title: "Monthly Sustainability Review",
        description: "Review progress on green initiatives and plan next steps",
        date: "2025-03-01",
        time: "14:00",
        location: "Conference Room A",
        createdBy: "STAFF_001",
        createdAt: new Date().toISOString()
      },
      {
        id: "meet2",
        title: "Campus Recycling Program Launch",
        description: "Kickoff meeting for the new campus-wide recycling initiative",
        date: "2025-03-15",
        time: "10:00",
        location: "UTM Auditorium",
        createdBy: "STAFF_001",
        createdAt: new Date().toISOString()
      }
    ],
    members: [
      { userId: "STAFF_001", name: "Dr. A. Ramgoolam", role: "admin", isLeader: true },
      { userId: "230325359", name: "Pierre Adrien Genave", role: "student" }
    ],
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: "2",
    id: 2,
    name: "Coding & Hackathon Club",
    memberCount: 5,
    membersCount: 5,
    nextMeeting: "2025-03-12",
    description: "A community for programmers to collaborate, learn, and compete in hackathons.",
    category: "technology",
    banner: "bg-indigo-600",
    status: 'active',
    creatorRole: 'student',
    creatorId: '230325359',
    leader: "Pierre Adrien Genave",
    documents: [
      {
        id: "doc3",
        name: "Hackathon Rules 2025.pdf",
        size: "650 KB",
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "230325359"
      },
      {
        id: "doc4",
        name: "Coding Resources & Tutorials.zip",
        size: "15.8 MB",
        uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        uploadedBy: "230325359"
      }
    ],
    meetings: [
      {
        id: "meet3",
        title: "Weekly Coding Workshop",
        description: "Learn advanced algorithms and data structures",
        date: "2025-03-12",
        time: "18:00",
        location: "Computer Lab 2",
        createdBy: "230325359",
        createdAt: new Date().toISOString()
      },
      {
        id: "meet4",
        title: "Hackathon Planning Meeting",
        description: "Plan the upcoming 48-hour hackathon event",
        date: "2025-03-20",
        time: "17:00",
        location: "Innovation Hub",
        createdBy: "230325359",
        createdAt: new Date().toISOString()
      }
    ],
    members: [
      { userId: "230325359", name: "Pierre Adrien Genave", role: "student", isLeader: true },
      { userId: "STU_002", name: "Sarah Johnson", role: "student" },
      { userId: "STU_003", name: "Ahmed Khan", role: "student" },
      { userId: "STU_004", name: "Maria Silva", role: "student" },
      { userId: "STU_005", name: "Chen Wei", role: "student" }
    ],
    isMember: false,
    createdAt: new Date().toISOString()
  },
  {
    _id: "3",
    id: 3,
    name: "Industry Advisory Panel",
    memberCount: 2,
    membersCount: 2,
    nextMeeting: "2025-04-10",
    description: "Bridging the gap between UTM academia and the corporate sector.",
    category: "industry",
    banner: "bg-purple-600",
    status: 'active',
    creatorRole: 'stakeholder',
    creatorId: 'EXT_999',
    leader: "Tech Corp Ltd",
    documents: [],
    meetings: [
      {
        id: "meet5",
        title: "Industry Partnership Opportunities",
        description: "Discuss collaboration opportunities between UTM and industry partners",
        date: "2025-04-10",
        time: "15:00",
        location: "Boardroom",
        createdBy: "EXT_999",
        createdAt: new Date().toISOString()
      }
    ],
    members: [
      { userId: "EXT_999", name: "Tech Corp Ltd", role: "stakeholder", isLeader: true },
      { userId: "STAFF_001", name: "Dr. A. Ramgoolam", role: "admin" }
    ],
    isMember: false,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_USERS = [
  {
    id: "230325359",
    name: "Pierre Adrien Genave",
    email: "p.genave@umail.utm.ac.mu",
    password: "$2b$10$pxgGj1csN5EBQo9bytgZJO/8ZKh1LD/AaOO7KJsCjhPcE83KH3cmK", // password: "student123"
    role: "student",
    status: "active",
    isVerified: true,
    joined: "2023-08-15",
    department: "Sustainable Dev",
    phone: "+230 5555 1234",
    bio: "Student passionate about sustainability",
    avatar: "https://ui-avatars.com/api/?name=Pierre+Adrien+Genave&background=10b981&color=fff",
    activity: []
  },
  {
    id: "STAFF_001",
    name: "Dr. A. Ramgoolam",
    email: "a.ramgoolam@utm.ac.mu",
    password: "$2b$10$EsBoDmfS0DGi5aPRcsEdmushf0CBX./X8UawLigHZN/UcRNsx4ubS", // password: "admin123"
    role: "admin",
    status: "active",
    isVerified: true,
    joined: "2020-01-10",
    department: "ICS Faculty",
    phone: "+230 5555 9876",
    bio: "Faculty Administrator",
    avatar: "https://ui-avatars.com/api/?name=Dr+A+Ramgoolam&background=005eb8&color=fff",
    activity: []
  },
  {
    id: "EXT_999",
    name: "Tech Corp Ltd",
    email: "contact@techcorp.mu",
    password: "$2b$10$kfgoWBEHhhXB.HHtMEz7quzEkQua6pEXCc/bEgox4vmYXnRZ1GaJ.", // password: "stakeholder123"
    role: "stakeholder",
    status: "active",
    isVerified: true,
    joined: "2024-01-05",
    department: "Industry",
    phone: "+230 5555 5555",
    bio: "Industry Technology Partner",
    avatar: "https://ui-avatars.com/api/?name=Tech+Corp+Ltd&background=06b6d4&color=fff",
    activity: []
  },
];

const INITIAL_POSTS = [
  {
    id: 1,
    committeeId: 1,
    userId: "230325359",
    user: "Pierre Adrien Genave",
    role: "Student",
    avatar: "bg-emerald-100 text-emerald-600",
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    content: "Great turnout at today's recycling workshop! ♻️ Thanks to everyone who helped sort the new bins.",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=1000&auto=format&fit=crop",
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  }
];

const SYSTEM_LOGS = [
  {
    id: 1,
    action: "User Login",
    details: "Pierre Adrien Genave logged in",
    time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    type: "info"
  },
  {
    id: 2,
    action: "Event Approved",
    details: "Tech Innovation Summit 2025 approved by Admin",
    time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    type: "success"
  },
  {
    id: 3,
    action: "Event Approved",
    details: "Career Fair 2025 approved by Admin",
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: "success"
  },
];

const ANALYTICS_DATA = {
  eventDistribution: [
    { name: 'Workshops', value: 35 },
    { name: 'Seminars', value: 25 },
    { name: 'Social', value: 20 },
    { name: 'Community', value: 20 },
  ],
  participation: [
    { name: 'Jan', students: 120, stakeholders: 30 },
    { name: 'Feb', students: 150, stakeholders: 45 },
    { name: 'Mar', students: 200, stakeholders: 60 },
    { name: 'Apr', students: 180, stakeholders: 50 },
  ]
};

module.exports = {
  INITIAL_EVENTS,
  INITIAL_COMMITTEES,
  INITIAL_USERS,
  INITIAL_POSTS,
  SYSTEM_LOGS,
  ANALYTICS_DATA
};
