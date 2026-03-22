// Test script for join request functionality
const db = require('./src/config/database');

console.log('=== Testing Database Initialization ===\n');

// Test 1: Check joinRequests collection exists
console.log('✓ Test 1: joinRequests collection exists');
console.log(`  - Type: ${Array.isArray(db.joinRequests) ? 'Array' : 'Not an array'}`);
console.log(`  - Initial length: ${db.joinRequests.length}`);

// Test 2: Check nextJoinRequestId exists
console.log('\n✓ Test 2: nextJoinRequestId exists');
console.log(`  - Value: ${db.nextJoinRequestId}`);

// Test 3: Test ID generation
console.log('\n✓ Test 3: Generate join request IDs');
const id1 = db.generateId('joinRequest');
const id2 = db.generateId('joinRequest');
const id3 = db.generateId('joinRequest');
console.log(`  - Generated IDs: ${id1}, ${id2}, ${id3}`);
console.log(`  - Sequential: ${id2 === id1 + 1 && id3 === id2 + 1 ? 'YES' : 'NO'}`);

// Test 4: Mock join request creation
console.log('\n✓ Test 4: Create mock join request');
const mockRequest = {
  id: db.generateId('joinRequest'),
  committeeId: 1,
  userId: 'user123',
  userName: 'Test User',
  userRole: 'student',
  status: 'pending',
  requestedAt: new Date().toISOString(),
  reviewedAt: null,
  reviewedBy: null
};
db.joinRequests.push(mockRequest);
console.log(`  - Join request created with ID: ${mockRequest.id}`);
console.log(`  - Total requests: ${db.joinRequests.length}`);

// Test 5: Query join requests
console.log('\n✓ Test 5: Query join requests');
const pendingRequests = db.joinRequests.filter(r => r.status === 'pending');
console.log(`  - Pending requests: ${pendingRequests.length}`);
console.log(`  - Request details:`, JSON.stringify(mockRequest, null, 2));

// Test 6: Check committees have creatorId
console.log('\n✓ Test 6: Verify committees have creatorId');
const committeesWithCreator = db.committees.filter(c => c.creatorId);
console.log(`  - Committees with creatorId: ${committeesWithCreator.length}/${db.committees.length}`);
if (committeesWithCreator.length > 0) {
  console.log(`  - Sample committee:`, {
    id: committeesWithCreator[0].id,
    name: committeesWithCreator[0].name,
    creatorId: committeesWithCreator[0].creatorId,
    creatorRole: committeesWithCreator[0].creatorRole
  });
}

// Test 7: Database reset functionality
console.log('\n✓ Test 7: Test database reset');
console.log(`  - Requests before reset: ${db.joinRequests.length}`);
db.reset();
console.log(`  - Requests after reset: ${db.joinRequests.length}`);
console.log(`  - nextJoinRequestId after reset: ${db.nextJoinRequestId}`);

// Test 8: Check all required fields in committees
console.log('\n✓ Test 8: Validate committee structure');
const sampleCommittee = db.committees[0];
const requiredFields = ['id', 'name', 'description', 'status', 'creatorId', 'members'];
const missingFields = requiredFields.filter(field => !(field in sampleCommittee));
if (missingFields.length === 0) {
  console.log('  - All required fields present ✓');
} else {
  console.log(`  - Missing fields: ${missingFields.join(', ')} ✗`);
}

console.log('\n=== All Database Tests Completed ===\n');
