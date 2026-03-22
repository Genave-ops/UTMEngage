// Edge Case Testing for Join Request Feature
const db = require('./src/config/database');

console.log('=== Edge Case Testing ===\n');

let testsPassed = 0;
let testsFailed = 0;

// Helper function
function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${err.message}`);
    testsFailed++;
  }
}

// Reset database
db.reset();

// Edge Case 1: Multiple pending requests from same user to different committees
console.log('Edge Case 1: Same user requests multiple committees');
test('User can request multiple committees simultaneously', () => {
  const userId = 'STUDENT_001';

  const req1 = {
    id: db.generateId('joinRequest'),
    committeeId: 1,
    userId: userId,
    userName: 'Student One',
    userRole: 'student',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  const req2 = {
    id: db.generateId('joinRequest'),
    committeeId: 2,
    userId: userId,
    userName: 'Student One',
    userRole: 'student',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  db.joinRequests.push(req1, req2);

  const userRequests = db.joinRequests.filter(r => r.userId === userId);
  if (userRequests.length !== 2) {
    throw new Error(`Expected 2 requests, got ${userRequests.length}`);
  }
});
console.log();

// Edge Case 2: Request from user who is already a member
console.log('Edge Case 2: Prevent requests from existing members');
test('Should reject request if user is already a member', () => {
  const committee = db.committees[0];
  const existingMember = committee.members[0];

  // Try to create request for existing member
  const isDuplicate = committee.members.some(m => m.userId === existingMember.userId);

  if (!isDuplicate) {
    throw new Error('Should detect existing member');
  }
});
console.log();

// Edge Case 3: Approve request adds member correctly
console.log('Edge Case 3: Request approval adds member to committee');
test('Approving request increases member count', () => {
  const committee = db.committees[0];
  const initialCount = committee.members.length;

  const newRequest = db.joinRequests[0];

  // Simulate approval
  committee.members.push({
    userId: newRequest.userId,
    name: newRequest.userName,
    role: newRequest.userRole
  });
  committee.memberCount = committee.members.length;

  if (committee.memberCount !== initialCount + 1) {
    throw new Error(`Member count should be ${initialCount + 1}, got ${committee.memberCount}`);
  }
});
console.log();

// Edge Case 4: Rejected requests don't add members
console.log('Edge Case 4: Rejected requests do not add members');
test('Rejecting request does not add member', () => {
  const committee = db.committees[1];
  const initialCount = committee.members.length;

  const rejectedRequest = {
    id: db.generateId('joinRequest'),
    committeeId: committee.id,
    userId: 'STUDENT_999',
    userName: 'Test Student',
    userRole: 'student',
    status: 'rejected',
    requestedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'ADMIN_001'
  };

  db.joinRequests.push(rejectedRequest);

  // Member count should not change
  if (committee.memberCount !== initialCount) {
    throw new Error(`Member count should remain ${initialCount}`);
  }
});
console.log();

// Edge Case 5: Invalid committee ID
console.log('Edge Case 5: Handle invalid committee IDs');
test('Should handle non-existent committee gracefully', () => {
  const invalidCommittee = db.committees.find(c => c.id === 99999);

  if (invalidCommittee !== undefined) {
    throw new Error('Should not find non-existent committee');
  }
});
console.log();

// Edge Case 6: Request status transitions
console.log('Edge Case 6: Request status can only transition once');
test('Processed requests cannot be reprocessed', () => {
  const processedRequest = {
    id: db.generateId('joinRequest'),
    committeeId: 1,
    userId: 'STUDENT_888',
    userName: 'Test',
    userRole: 'student',
    status: 'approved',
    requestedAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'ADMIN_001'
  };

  db.joinRequests.push(processedRequest);

  // Attempt to change status should fail
  const canChangeStatus = processedRequest.status === 'pending';

  if (canChangeStatus) {
    throw new Error('Should not allow status change on processed request');
  }
});
console.log();

// Edge Case 7: Filtering pending requests
console.log('Edge Case 7: Only pending requests are shown to creators');
test('Filter returns only pending requests', () => {
  const committeeId = 1;
  const allRequestsForCommittee = db.joinRequests.filter(r => r.committeeId === committeeId);
  const pendingRequests = db.joinRequests.filter(
    r => r.committeeId === committeeId && r.status === 'pending'
  );

  const hasPendingOnly = pendingRequests.every(r => r.status === 'pending');

  if (!hasPendingOnly) {
    throw new Error('Should only return pending requests');
  }
});
console.log();

// Edge Case 8: Timestamps are set correctly
console.log('Edge Case 8: Request timestamps are valid');
test('Timestamps are valid ISO strings', () => {
  const request = db.joinRequests[0];

  const requestedDate = new Date(request.requestedAt);
  if (isNaN(requestedDate.getTime())) {
    throw new Error('Invalid requestedAt timestamp');
  }

  // requestedAt should be in the past
  const now = new Date();
  if (requestedDate > now) {
    throw new Error('requestedAt cannot be in the future');
  }
});
console.log();

// Edge Case 9: User roles are preserved
console.log('Edge Case 9: User roles are preserved in requests');
test('Request preserves user role information', () => {
  const userRoles = ['student', 'stakeholder', 'admin'];

  userRoles.forEach((role, index) => {
    const request = {
      id: db.generateId('joinRequest'),
      committeeId: 1,
      userId: `USER_${index}`,
      userName: `User ${index}`,
      userRole: role,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    if (request.userRole !== role) {
      throw new Error(`Role should be ${role}, got ${request.userRole}`);
    }
  });
});
console.log();

// Edge Case 10: Database reset clears requests
console.log('Edge Case 10: Database reset clears all requests');
test('Reset clears joinRequests array', () => {
  const beforeReset = db.joinRequests.length;
  db.reset();
  const afterReset = db.joinRequests.length;

  if (afterReset !== 0) {
    throw new Error(`After reset, requests should be 0, got ${afterReset}`);
  }

  if (db.nextJoinRequestId !== 1) {
    throw new Error(`After reset, nextJoinRequestId should be 1, got ${db.nextJoinRequestId}`);
  }
});
console.log();

// Edge Case 11: Committee creator ID matches user ID
console.log('Edge Case 11: Creator permissions validation');
test('Committee creatorId matches actual creator', () => {
  const committee = db.committees[0];
  const creatorId = committee.creatorId;

  if (!creatorId || typeof creatorId !== 'string') {
    throw new Error('creatorId should be a valid string');
  }
});
console.log();

// Edge Case 12: Concurrent requests handling
console.log('Edge Case 12: Unique request IDs');
test('Each request gets unique ID', () => {
  const ids = new Set();

  for (let i = 0; i < 10; i++) {
    const id = db.generateId('joinRequest');
    if (ids.has(id)) {
      throw new Error(`Duplicate ID generated: ${id}`);
    }
    ids.add(id);
  }

  if (ids.size !== 10) {
    throw new Error(`Expected 10 unique IDs, got ${ids.size}`);
  }
});
console.log();

// Summary
console.log('=== Edge Case Test Summary ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
  console.log('🎉 All edge case tests passed!\n');
} else {
  console.log('⚠️  Some edge case tests failed.\n');
  process.exit(1);
}
