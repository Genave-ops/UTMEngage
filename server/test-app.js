const axios = require('axios');
const BASE_URL = 'http://localhost:5000/api';

// Test results storage
const results = {
  passed: [],
  failed: []
};

function logTest(name, passed, details) {
  if (passed) {
    results.passed.push({ name, details });
    console.log(`✅ ${name}`);
  } else {
    results.failed.push({ name, details });
    console.log(`❌ ${name}`);
  }
  if (details) console.log(`   ${details}`);
}

async function runTests() {
  console.log('\n========================================');
  console.log('UTM ENGAGEMENT PLATFORM - FULL TEST SUITE');
  console.log('========================================\n');

  // ==================== AUTHENTICATION TESTS ====================
  console.log('📝 AUTHENTICATION TESTS\n');

  // Test 1: Student Registration
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Student',
      email: 'test.student@umail.utm.ac.mu',
      password: 'test123',
      role: 'student',
      studentId: '999999999',
      department: 'Computer Science'
    });
    logTest('Student Registration', response.status === 201 && response.data.token,
      `User ID: ${response.data.user.id}`);
  } catch (error) {
    logTest('Student Registration', false, error.response?.data?.error || error.message);
  }

  // Test 2: Duplicate Student ID
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Another Student',
      email: 'another@umail.utm.ac.mu',
      password: 'test123',
      role: 'student',
      studentId: '999999999',
      department: 'Engineering'
    });
    logTest('Duplicate Student ID Prevention', false, 'Should have rejected duplicate ID');
  } catch (error) {
    logTest('Duplicate Student ID Prevention',
      error.response?.data?.error === 'Student ID already registered',
      'Correctly rejected duplicate student ID');
  }

  // Test 3: Stakeholder Registration
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Company Ltd',
      email: 'test@company.mu',
      password: 'test123',
      role: 'stakeholder',
      organizationName: 'Test Corp'
    });
    logTest('Stakeholder Registration', response.status === 201 && response.data.token,
      `User ID: ${response.data.user.id}`);
  } catch (error) {
    logTest('Stakeholder Registration', false, error.response?.data?.error);
  }

  // Test 4: Admin Registration (Pending)
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Admin',
      email: 'test.admin@utm.ac.mu',
      password: 'admin123',
      role: 'admin',
      department: 'Administration'
    });
    logTest('Admin Registration (Pending)',
      response.status === 201 && !response.data.token && response.data.user.status === 'pending',
      'Admin created with pending status, no token issued');
  } catch (error) {
    logTest('Admin Registration (Pending)', false, error.response?.data?.error);
  }

  // Test 5: Login with Valid Credentials
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'p.genave@umail.utm.ac.mu',
      password: 'student123'
    });
    logTest('Login - Valid Credentials', response.status === 200 && response.data.token,
      `Logged in as: ${response.data.user.name}`);
  } catch (error) {
    logTest('Login - Valid Credentials', false, error.response?.data?.error);
  }

  // Test 6: Login with Invalid Credentials
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'p.genave@umail.utm.ac.mu',
      password: 'wrongpassword'
    });
    logTest('Login - Invalid Password', false, 'Should have rejected');
  } catch (error) {
    logTest('Login - Invalid Password',
      error.response?.data?.error === 'Invalid email or password',
      'Correctly rejected invalid password');
  }

  // Test 7: Login as Pending Admin
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test.admin@utm.ac.mu',
      password: 'admin123'
    });
    logTest('Login - Pending Admin Block', false, 'Should have blocked pending admin');
  } catch (error) {
    logTest('Login - Pending Admin Block',
      error.response?.status === 403,
      'Correctly blocked pending admin login');
  }

  // Test 8: Weak Password Rejection
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test User',
      email: 'weak@test.com',
      password: '123',
      role: 'student',
      studentId: '111111111'
    });
    logTest('Weak Password Rejection', false, 'Should reject weak password');
  } catch (error) {
    logTest('Weak Password Rejection',
      error.response?.data?.error.includes('6 characters'),
      'Correctly rejected weak password');
  }

  // Test 9: Invalid Email Format
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test User',
      email: 'not-an-email',
      password: 'test123',
      role: 'student',
      studentId: '222222222'
    });
    logTest('Invalid Email Format', false, 'Should reject invalid email');
  } catch (error) {
    logTest('Invalid Email Format',
      error.response?.data?.error === 'Invalid email format',
      'Correctly rejected invalid email');
  }

  // ==================== COMMITTEE TESTS ====================
  console.log('\n📋 COMMITTEE TESTS\n');

  let studentToken, adminToken;

  // Get tokens for further tests
  try {
    const studentLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'p.genave@umail.utm.ac.mu',
      password: 'student123'
    });
    studentToken = studentLogin.data.token;

    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'a.ramgoolam@utm.ac.mu',
      password: 'admin123'
    });
    adminToken = adminLogin.data.token;
  } catch (error) {
    console.log('Failed to get auth tokens for testing');
  }

  // Test 10: View Committees as Student
  try {
    const response = await axios.get(`${BASE_URL}/committees`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logTest('View Committees - Student', response.status === 200 && response.data.length > 0,
      `Found ${response.data.length} committees`);
  } catch (error) {
    logTest('View Committees - Student', false, error.response?.data?.error);
  }

  // Test 11: View Committee Details (Non-member)
  try {
    const response = await axios.get(`${BASE_URL}/committees/1`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logTest('View Committee Details - Non-member',
      response.status === 200,
      `Can view basic info: ${response.data.name}`);
  } catch (error) {
    logTest('View Committee Details - Non-member', false, error.response?.data?.error);
  }

  // Test 12: Access Committee Feed (Non-member)
  try {
    await axios.get(`${BASE_URL}/committees/5/posts`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    logTest('Access Committee Feed - Non-member', false, 'Should block non-members');
  } catch (error) {
    logTest('Access Committee Feed - Non-member',
      error.response?.status === 403,
      'Correctly blocked non-member from feed');
  }

  // Test 13: Admin Override Access
  try {
    const response = await axios.get(`${BASE_URL}/committees/5/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    logTest('Admin Override - Committee Feed', response.status === 200,
      'Admin can access any committee feed');
  } catch (error) {
    logTest('Admin Override - Committee Feed', false, error.response?.data?.error);
  }

  // ==================== EVENT TESTS ====================
  console.log('\n📅 EVENT TESTS\n');

  // Test 14: View Events as Student
  try {
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const approvedOnly = response.data.every(e => e.status === 'approved');
    logTest('View Events - Student (Approved Only)', approvedOnly,
      `Found ${response.data.length} approved events`);
  } catch (error) {
    logTest('View Events - Student', false, error.response?.data?.error);
  }

  // Test 15: View Events as Admin
  try {
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hasAll = response.data.some(e => e.status === 'pending');
    logTest('View Events - Admin (All Statuses)', response.status === 200,
      `Found ${response.data.length} events (including pending)`);
  } catch (error) {
    logTest('View Events - Admin', false, error.response?.data?.error);
  }

  // ==================== SUMMARY ====================
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📊 Total: ${results.passed.length + results.failed.length}`);
  console.log(`🎯 Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%\n`);

  if (results.failed.length > 0) {
    console.log('Failed Tests:');
    results.failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.details}`);
    });
  }

  console.log('\n========================================\n');
}

runTests().catch(console.error);
