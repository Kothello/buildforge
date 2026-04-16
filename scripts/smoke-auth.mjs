#!/usr/bin/env node
/**
 * Smoke Test for Authentication
 * 
 * Makes real HTTP requests to verify:
 * - Protected endpoints return 401 without auth
 * - Public endpoints are accessible
 * - Auth-by-default is working correctly
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

// Sensitive endpoints that MUST require auth
const PROTECTED_ENDPOINTS = [
  { method: 'GET', path: '/api/users', description: 'User list' },
  { method: 'GET', path: '/api/users/assignable', description: 'Assignable users' },
  { method: 'GET', path: '/api/admin/settings', description: 'Admin settings' },
  { method: 'GET', path: '/api/reports/summary', description: 'Reports summary' },
  { method: 'GET', path: '/api/callbacks', description: 'Callbacks list' },
  { method: 'GET', path: '/api/contacts', description: 'Contacts list' },
  { method: 'GET', path: '/api/leads', description: 'Leads list' },
  { method: 'GET', path: '/api/crm/deals', description: 'Deals list' },
  { method: 'GET', path: '/api/tasks', description: 'Tasks list' },
  { method: 'GET', path: '/api/my/tasks', description: 'My tasks' },
  { method: 'POST', path: '/api/ai/morning-brief', description: 'AI morning brief' },
  { method: 'POST', path: '/api/leads/parse', description: 'AI lead parse' },
];

// Public endpoints that should work without auth
const PUBLIC_ENDPOINTS = [
  { method: 'POST', path: '/api/auth/login', body: { email: 'test', password: 'test' }, description: 'Login endpoint' },
];

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testProtectedEndpoint(endpoint) {
  try {
    const result = await makeRequest(endpoint.method, endpoint.path);
    
    if (result.status === 401) {
      return { success: true, message: `✅ Returns 401`, status: result.status };
    } else {
      return { 
        success: false, 
        message: `❌ SECURITY ISSUE: Returns ${result.status} instead of 401`, 
        status: result.status,
        data: result.data
      };
    }
  } catch (error) {
    return { success: false, message: `❌ Request failed: ${error.message}` };
  }
}

async function testPublicEndpoint(endpoint) {
  try {
    const result = await makeRequest(endpoint.method, endpoint.path, endpoint.body);
    
    // For login endpoint, check the error message
    // If it says "Invalid credentials" that means the endpoint is accessible (just wrong creds)
    // If it says "Authentication required" that means auth-by-default blocked it
    if (endpoint.path === '/api/auth/login') {
      if (result.status === 401 && result.data?.error === 'Invalid credentials') {
        return { success: true, message: `✅ Accessible (returns proper login error)`, status: result.status };
      } else if (result.status === 401 && result.data?.error === 'Authentication required') {
        return { 
          success: false, 
          message: `❌ BLOCKED by auth-by-default middleware`, 
          status: result.status 
        };
      } else {
        return { success: true, message: `✅ Accessible (${result.status})`, status: result.status };
      }
    }
    
    // For other public endpoints, any non-401 "Authentication required" is fine
    if (result.status === 401 && result.data?.error === 'Authentication required') {
      return { 
        success: false, 
        message: `❌ Public endpoint blocked by auth-by-default`, 
        status: result.status 
      };
    }
    
    return { success: true, message: `✅ Accessible (${result.status})`, status: result.status };
  } catch (error) {
    return { success: false, message: `❌ Request failed: ${error.message}` };
  }
}

async function runSmokeTest() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         AUTHENTICATION SMOKE TEST                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Testing against: ${BASE_URL}\n`);
  
  // Test 1: Protected endpoints
  console.log('📍 1. PROTECTED ENDPOINTS (must return 401 without auth)');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  let protectedPassed = 0;
  let protectedFailed = 0;
  const failures = [];
  
  for (const endpoint of PROTECTED_ENDPOINTS) {
    const result = await testProtectedEndpoint(endpoint);
    console.log(`  ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(35)} ${result.message}`);
    
    if (result.success) {
      protectedPassed++;
    } else {
      protectedFailed++;
      failures.push({ endpoint, result });
    }
  }
  
  console.log(`\n  Result: ${protectedPassed}/${PROTECTED_ENDPOINTS.length} passed\n`);
  
  // Test 2: Public endpoints
  console.log('📍 2. PUBLIC ENDPOINTS (must be accessible)');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  let publicPassed = 0;
  let publicFailed = 0;
  
  for (const endpoint of PUBLIC_ENDPOINTS) {
    const result = await testPublicEndpoint(endpoint);
    console.log(`  ${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(35)} ${result.message}`);
    
    if (result.success) {
      publicPassed++;
    } else {
      publicFailed++;
      failures.push({ endpoint, result });
    }
  }
  
  console.log(`\n  Result: ${publicPassed}/${PUBLIC_ENDPOINTS.length} passed\n`);
  
  // Summary
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         SMOKE TEST SUMMARY                                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  if (protectedFailed === 0 && publicFailed === 0) {
    console.log('✅ ALL TESTS PASSED');
    console.log(`✅ ${protectedPassed} protected endpoints correctly return 401`);
    console.log(`✅ ${publicPassed} public endpoints accessible\n`);
    return 0;
  } else {
    console.log('❌ SECURITY ISSUES FOUND\n');
    
    if (protectedFailed > 0) {
      console.log(`❌ ${protectedFailed} protected endpoints NOT returning 401:\n`);
      failures.filter(f => PROTECTED_ENDPOINTS.includes(f.endpoint)).forEach(f => {
        console.log(`  ${f.endpoint.method} ${f.endpoint.path}`);
        console.log(`    Status: ${f.result.status}`);
        if (f.result.data) {
          console.log(`    Response: ${JSON.stringify(f.result.data).substring(0, 100)}`);
        }
        console.log('');
      });
    }
    
    if (publicFailed > 0) {
      console.log(`❌ ${publicFailed} public endpoints blocked:\n`);
      failures.filter(f => PUBLIC_ENDPOINTS.includes(f.endpoint)).forEach(f => {
        console.log(`  ${f.endpoint.method} ${f.endpoint.path}`);
        console.log('');
      });
    }
    
    return 1;
  }
}

// Check if server is running
console.log('Checking if server is running...\n');

makeRequest('GET', '/api/health').then(() => {
  console.log('✅ Server is running\n');
  return runSmokeTest();
}).then(exitCode => {
  process.exit(exitCode);
}).catch(err => {
  console.error(`❌ Cannot connect to server at ${BASE_URL}`);
  console.error(`   Make sure the server is running: npm run dev`);
  console.error(`   Error: ${err.message}\n`);
  process.exit(1);
});
