// API Integration Test for Join Request Endpoints
const request = require('supertest');
const express = require('express');
const cors = require('cors');
const db = require('./src/config/database');
const { generateToken, verifyToken, requireCommitteeCreator } = require('./src/middleware/auth');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Import routes - simplified version for testing
app.post('/api/committees/:id/request-join', verifyToken, (req, res) => {
  const committee = db.committees.find(c => c.id === parseInt(req.params.id));
  if (!committee) {
    return res.status(404).json({ error: 'Committee not found' });
  }

  if (committee.members?.some(m => m.userId === req.user.id)) {
    return res.status(400).json({ error: 'Already a member of this committee' });
  }

  const existingRequest = db.joinRequests.find(
    r => r.committeeId === parseInt(req.params.id) &&
         r.userId === req.user.id &&
         r.status === 'pending'
  );

  if (existingRequest) {
    return res.status(400).json({ error: 'You already have a pending request for this committee' });
  }

  const joinRequest = {
    id: db.generateId('joinRequest'),
    committeeId: parseInt(req.params.id),
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null
  };

  db.joinRequests.push(joinRequest);
  res.status(201).json({ message: 'Join request submitted successfully', request: joinRequest });
});

app.get('/api/committees/:id/join-requests', verifyToken, requireCommitteeCreator(db), (req, res) => {
  const committeeId = parseInt(req.params.id);
  const requests = db.joinRequests.filter(
    r => r.committeeId === committeeId && r.status === 'pending'
  );
  res.json(requests);
});

app.put('/api/committees/:id/join-requests/:requestId/approve', verifyToken, requireCommitteeCreator(db), (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const joinRequest = db.joinRequests.find(r => r.id === requestId);

  if (!joinRequest) {
    return res.status(404).json({ error: 'Join request not found' });
  }

  if (joinRequest.status !== 'pending') {
    return res.status(400).json({ error: 'This request has already been processed' });
  }

  const committee = req.committee;

  committee.members.push({
    userId: joinRequest.userId,
    name: joinRequest.userName,
    role: joinRequest.userRole
  });
  committee.memberCount = committee.members.length;

  joinRequest.status = 'approved';
  joinRequest.reviewedAt = new Date().toISOString();
  joinRequest.reviewedBy = req.user.id;

  res.json({
    message: 'Join request approved successfully',
    request: joinRequest,
    committee
  });
});

app.put('/api/committees/:id/join-requests/:requestId/reject', verifyToken, requireCommitteeCreator(db), (req, res) => {
  const requestId = parseInt(req.params.requestId);
  const joinRequest = db.joinRequests.find(r => r.id === requestId);

  if (!joinRequest) {
    return res.status(404).json({ error: 'Join request not found' });
  }

  if (joinRequest.status !== 'pending') {
    return res.status(400).json({ error: 'This request has already been processed' });
  }

  joinRequest.status = 'rejected';
  joinRequest.reviewedAt = new Date().toISOString();
  joinRequest.reviewedBy = req.user.id;

  res.json({
    message: 'Join request rejected successfully',
    request: joinRequest
  });
});

// Run tests
async function runTests() {
  console.log('=== API Endpoint Integration Tests ===\n');

  // Reset database
  db.reset();

  // Create test users
  const studentUser = {
    id: 'TEST_STUDENT_001',
    email: 'student@utm.my',
    role: 'student',
    name: 'Test Student'
  };

  const creatorUser = {
    id: 'STAFF_001',
    email: 'admin@utm.my',
    role: 'admin',
    name: 'Admin User'
  };

  // Generate tokens
  const studentToken = generateToken(studentUser);
  const creatorToken = generateToken(creatorUser);

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Submit join request without auth token
  console.log('Test 1: Submit join request WITHOUT authentication');
  try {
    const res = await request(app)
      .post('/api/committees/1/request-join')
      .send({});

    if (res.status === 401) {
      console.log('✓ PASS: Returns 401 without token\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 401, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 2: Submit join request with valid token
  console.log('Test 2: Submit join request WITH authentication');
  try {
    const res = await request(app)
      .post('/api/committees/1/request-join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    if (res.status === 201 && res.body.request) {
      console.log('✓ PASS: Request created successfully');
      console.log(`  - Request ID: ${res.body.request.id}`);
      console.log(`  - Status: ${res.body.request.status}\n`);
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 201, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 3: Duplicate join request
  console.log('Test 3: Submit duplicate join request');
  try {
    const res = await request(app)
      .post('/api/committees/1/request-join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    if (res.status === 400 && res.body.error.includes('pending request')) {
      console.log('✓ PASS: Rejects duplicate request\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 400 for duplicate, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 4: Get join requests as non-creator
  console.log('Test 4: Get join requests as NON-CREATOR');
  try {
    const res = await request(app)
      .get('/api/committees/1/join-requests')
      .set('Authorization', `Bearer ${studentToken}`);

    if (res.status === 403) {
      console.log('✓ PASS: Non-creator cannot view requests\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 403, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 5: Get join requests as creator
  console.log('Test 5: Get join requests as CREATOR');
  try {
    const res = await request(app)
      .get('/api/committees/1/join-requests')
      .set('Authorization', `Bearer ${creatorToken}`);

    if (res.status === 200 && Array.isArray(res.body)) {
      console.log('✓ PASS: Creator can view requests');
      console.log(`  - Pending requests: ${res.body.length}\n`);
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 200 with array, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 6: Approve join request as creator
  console.log('Test 6: Approve join request as CREATOR');
  try {
    const requestId = db.joinRequests[0].id;
    const res = await request(app)
      .put(`/api/committees/1/join-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({});

    if (res.status === 200 && res.body.request.status === 'approved') {
      console.log('✓ PASS: Request approved successfully');
      console.log(`  - New member count: ${res.body.committee.memberCount}\n`);
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 200 with approved status, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 7: Try to approve already processed request
  console.log('Test 7: Try to approve ALREADY PROCESSED request');
  try {
    const requestId = db.joinRequests[0].id;
    const res = await request(app)
      .put(`/api/committees/1/join-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({});

    if (res.status === 400 && res.body.error.includes('already been processed')) {
      console.log('✓ PASS: Prevents double-processing\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 400, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 8: Reject join request
  console.log('Test 8: Reject join request');
  try {
    // Create another request first
    const anotherStudent = {
      id: 'TEST_STUDENT_002',
      email: 'student2@utm.my',
      role: 'student',
      name: 'Another Student'
    };
    const anotherToken = generateToken(anotherStudent);

    await request(app)
      .post('/api/committees/1/request-join')
      .set('Authorization', `Bearer ${anotherToken}`)
      .send({});

    const newRequestId = db.joinRequests.find(r => r.status === 'pending').id;

    const res = await request(app)
      .put(`/api/committees/1/join-requests/${newRequestId}/reject`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({});

    if (res.status === 200 && res.body.request.status === 'rejected') {
      console.log('✓ PASS: Request rejected successfully\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 200 with rejected status, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Test 9: Request for non-existent committee
  console.log('Test 9: Request for NON-EXISTENT committee');
  try {
    const res = await request(app)
      .post('/api/committees/99999/request-join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    if (res.status === 404) {
      console.log('✓ PASS: Returns 404 for non-existent committee\n');
      testsPassed++;
    } else {
      console.log(`✗ FAIL: Expected 404, got ${res.status}\n`);
      testsFailed++;
    }
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}\n`);
    testsFailed++;
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✓ Passed: ${testsPassed}`);
  console.log(`✗ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log('🎉 All API endpoint tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
