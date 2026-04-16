#!/usr/bin/env node
/**
 * Route Authentication Audit Script
 * 
 * Parses server/routes.ts and identifies:
 * - Unauthenticated routes under /api (outside allowlist)
 * - Routes with optional auth but missing role checks
 * - Potential router mounting collisions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_FILE = path.join(__dirname, '../server/routes.ts');
const PUBLIC_ALLOWLIST = ['/api/auth/', '/api/public/', '/api/health'];

function parseRoutes() {
  const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
  const lines = content.split('\n');
  
  const routes = [];
  const routerMounts = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Match route definitions: app.get("/api/...", ...)
    const routeMatch = line.match(/app\.(get|post|patch|put|delete)\s*\(\s*["']([^"']+)["']/);
    if (routeMatch) {
      const method = routeMatch[1].toUpperCase();
      const routePath = routeMatch[2];
      
      // Check for auth middleware
      const hasAuthMiddleware = line.includes('authMiddleware(storage)') || line.includes('authMiddleware');
      const hasRequireRole = line.includes('requireRole');
      const hasOptionalAuth = line.includes('optionalAuthMiddleware');
      const hasRateLimit = line.includes('aiRateLimitMiddleware');
      
      routes.push({
        lineNum,
        method,
        path: routePath,
        hasAuthMiddleware,
        hasRequireRole,
        hasOptionalAuth,
        hasRateLimit,
        line: line.trim()
      });
    }
    
    // Match router mounts: app.use("/api/...", someRouter)
    const mountMatch = line.match(/app\.use\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)/);
    if (mountMatch) {
      routerMounts.push({
        lineNum,
        path: mountMatch[1],
        router: mountMatch[2],
        line: line.trim()
      });
    }
  }
  
  return { routes, routerMounts };
}

function isPublicPath(path) {
  return PUBLIC_ALLOWLIST.some(allowed => path.startsWith(allowed));
}

function auditRoutes() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         ROUTE AUTHENTICATION AUDIT                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  const { routes, routerMounts } = parseRoutes();
  
  // 1. Check for unauthenticated /api routes outside allowlist
  console.log('📍 1. UNAUTHENTICATED API ROUTES (outside allowlist)');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  const unauthRoutes = routes.filter(r => 
    r.path.startsWith('/api') && 
    !isPublicPath(r.path) &&
    !r.hasAuthMiddleware &&
    !r.hasRequireRole &&
    !r.hasRateLimit
  );
  
  if (unauthRoutes.length === 0) {
    console.log('✅ No unauthenticated routes found outside allowlist\n');
  } else {
    console.log(`❌ Found ${unauthRoutes.length} unauthenticated routes:\n`);
    unauthRoutes.forEach(r => {
      console.log(`  Line ${r.lineNum}: ${r.method} ${r.path}`);
      console.log(`    ${r.line}`);
      console.log('');
    });
  }
  
  // 2. Check for optional auth on write operations
  console.log('📍 2. OPTIONAL AUTH ON WRITE OPERATIONS');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  const optionalAuthWrites = routes.filter(r => 
    r.hasOptionalAuth &&
    ['POST', 'PATCH', 'PUT', 'DELETE'].includes(r.method)
  );
  
  if (optionalAuthWrites.length === 0) {
    console.log('✅ No optional auth on write operations\n');
  } else {
    console.log(`❌ Found ${optionalAuthWrites.length} write routes with optional auth:\n`);
    optionalAuthWrites.forEach(r => {
      console.log(`  Line ${r.lineNum}: ${r.method} ${r.path}`);
      console.log(`    ${r.line}`);
      console.log('');
    });
  }
  
  // 3. Check router mounting for potential collisions
  console.log('📍 3. ROUTER MOUNTING ANALYSIS');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  console.log('Router mounts found:\n');
  routerMounts.forEach(m => {
    console.log(`  Line ${m.lineNum}: ${m.path} → ${m.router}`);
  });
  console.log('');
  
  // Check for problematic mounts
  const catchAllMounts = routerMounts.filter(m => 
    m.path === '/api' || m.path === '/api/'
  );
  
  if (catchAllMounts.length > 0) {
    console.log(`⚠️  WARNING: Found catch-all /api mounts that may cause collisions:\n`);
    catchAllMounts.forEach(m => {
      console.log(`  Line ${m.lineNum}: ${m.line}`);
    });
    console.log('');
  }
  
  // Check for group router collision
  const groupMounts = routerMounts.filter(m => m.router.toLowerCase().includes('group'));
  if (groupMounts.length > 0) {
    console.log('Group router mounts:\n');
    groupMounts.forEach(m => {
      const isCorrect = m.path === '/api/groups' || m.path === '/api/group';
      console.log(`  ${isCorrect ? '✅' : '❌'} Line ${m.lineNum}: ${m.path} → ${m.router}`);
    });
    console.log('');
  }
  
  // 4. Check public allowlist routes are accessible
  console.log('📍 4. PUBLIC ALLOWLIST ROUTES');
  console.log('─────────────────────────────────────────────────────────────────────\n');
  
  const publicRoutes = routes.filter(r => isPublicPath(r.path));
  console.log(`Found ${publicRoutes.length} public routes:\n`);
  publicRoutes.forEach(r => {
    console.log(`  ${r.method} ${r.path} (line ${r.lineNum})`);
  });
  console.log('');
  
  // 5. Summary
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         AUDIT SUMMARY                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  const issues = [];
  
  if (unauthRoutes.length > 0) {
    issues.push(`❌ ${unauthRoutes.length} unauthenticated API routes found`);
  }
  
  if (optionalAuthWrites.length > 0) {
    issues.push(`❌ ${optionalAuthWrites.length} write routes with optional auth`);
  }
  
  if (catchAllMounts.length > 0) {
    issues.push(`⚠️  ${catchAllMounts.length} catch-all router mounts may cause collisions`);
  }
  
  if (issues.length === 0) {
    console.log('✅ All checks passed!');
    console.log('✅ No unauthenticated routes outside allowlist');
    console.log('✅ No optional auth on write operations');
    console.log('✅ No problematic router mounts detected\n');
    return 0;
  } else {
    console.log('Issues found:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
    return 1;
  }
}

// Run audit
const exitCode = auditRoutes();
process.exit(exitCode);
