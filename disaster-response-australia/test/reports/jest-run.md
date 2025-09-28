```

> disaster-response-australia@0.1.0 test:cov
> jest --coverage

 ⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of /Users/pengkaifan/Desktop/disaster-response-australia/pnpm-lock.yaml as the root directory.
 To silence this warning, set `outputFileTracingRoot` in your Next.js config, or consider removing one of the lockfiles if it's not needed.
   See https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats for more information.
 Detected additional lockfiles: 
   * /Users/pengkaifan/Desktop/disaster-response-australia/disaster-response-australia/pnpm-lock.yaml

PASS src/__tests__/login-modal.test.tsx
PASS src/__tests__/dashboard-page.test.tsx
PASS src/__tests__/management-page.test.tsx
PASS src/__tests__/console-page.test.tsx
PASS src/__tests__/theme.test.tsx
PASS src/__tests__/layout.test.tsx
PASS src/__tests__/text-overlay.test.tsx
PASS src/__tests__/firebase-client.test.ts
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   92.09 |    82.05 |   81.25 |   93.97 |                   
 app             |   83.78 |    61.53 |   81.25 |   87.87 |                   
  layout.tsx     |   85.71 |      100 |     100 |     100 |                   
  page.tsx       |   83.33 |    61.53 |      80 |   85.18 | 82-84,104         
 app/components  |   96.29 |    78.57 |     100 |   97.43 |                   
  LoginModal.tsx |     100 |      100 |     100 |     100 |                   
  TextOverlay.ts |      94 |    68.42 |     100 |   95.91 | 100-101           
 app/console     |   93.33 |     90.9 |   91.66 |   92.85 |                   
  page.tsx       |   93.33 |     90.9 |   91.66 |   92.85 | 73                
 app/firebase    |   93.33 |       75 |     100 |     100 |                   
  client.tsx     |   93.33 |       75 |     100 |     100 | 21                
 app/management  |   89.65 |    95.45 |   65.21 |   89.65 |                   
  page.tsx       |   89.65 |    95.45 |   65.21 |   89.65 | 90,140-157        
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 8 passed, 8 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        1.453 s
Ran all test suites.
```
