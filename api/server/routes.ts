*** Begin Patch
*** Update File: api/server/routes.ts
@@
   app.post(api.items.create.path, async (req, res) => {
     try {
-      log(`POST /api/items - Received data: ${JSON.stringify(req.body)}`);
-      const input = api.items.create.input.parse(req.body);
+      // Redact any privateFields from logs
+      const safeBody = { ...req.body };
+      if (safeBody.privateFields) safeBody.privateFields = '[REDACTED]';
+      log(`POST /api/items - Received data: ${JSON.stringify(safeBody)}`);
+      const input = api.items.create.input.parse(req.body);
       log(`POST /api/items - Validation successful`);
       
       const item = await storage.createItem(input);
       log(`POST /api/items - Database insert successful: ID ${item.id}`);
@@
-      res.status(201).json(item);
+      // Ensure private fields are not returned in public response
+      const safeItem = { ...item } as any;
+      delete safeItem.privateFields;
+      res.status(201).json(safeItem);
     } catch (err: any) {
@@
   app.get("/api/stats", async (req, res) => {
     const stats = await storage.getStats();
     res.json(stats);
   });
+
+  // Claim endpoint: submit a claim for a found item
+  app.post('/api/items/:id/claim', async (req, res) => {
+    try {
+      const item = await storage.getItem(Number(req.params.id));
+      if (!item) return res.status(404).json({ message: 'Item not found' });
+
+      const { claimantName, claimantEmail, answers } = req.body;
+      // answers: [{ q, a }]
+
+      // Compute match score if verification questions exist
+      let matchScore = 0;
+      try {
+        const privateFields = item.privateFields || {};
+        const storedQs = privateFields.verificationQuestions || [];
+        if (Array.isArray(storedQs) && Array.isArray(answers)) {
+          for (const sq of storedQs) {
+            const match = answers.find((a: any) => String(a.q).trim() === String(sq.q).trim());
+            if (match && match.a) {
+              const { hashAnswer } = await import('./crypto.js');
+              const aHash = hashAnswer(match.a);
+              if (aHash === sq.aHash) matchScore += 1;
+            }
+          }
+        }
+      } catch (e) {
+        // continue with matchScore=0
+      }
+
+      const claim = await storage.createClaim(Number(req.params.id), claimantName, claimantEmail, { answers }, matchScore);
+      // Notify reporter and admins
+      try { sendMatchNotification(claim); } catch (e) { log(`Claim notify error: ${e}`); }
+
+      res.status(201).json({ claimId: claim.id, matchScore, message: 'Claim submitted and pending review' });
+    } catch (err: any) {
+      log(`POST /api/items/:id/claim - Error: ${err}`);
+      res.status(500).json({ message: 'Internal Server Error' });
+    }
+  });
+
+  // Staff-only: review a claim
+  app.post('/api/claims/:id/review', async (req, res) => {
+    if (!req.isAuthenticated() || !(req.user as any)?.isAdmin) {
+      return res.status(401).json({ message: 'Unauthorized' });
+    }
+    try {
+      const claimId = Number(req.params.id);
+      const { action, notes, setStatus } = req.body; // action: 'accept'|'reject', setStatus: optional 'verified'|'resolved'
+      if (!['accept','reject'].includes(action)) return res.status(400).json({ message: 'Invalid action' });
+      const reviewer = (req.user as any)?.email || (req.user as any)?.id || 'admin';
+      const claim = await storage.reviewClaim(claimId, reviewer, action, notes, setStatus);
+      if (!claim) return res.status(404).json({ message: 'Claim not found' });
+      res.json({ message: 'Claim reviewed', claim });
+    } catch (err: any) {
+      log(`POST /api/claims/:id/review - Error: ${err}`);
+      res.status(500).json({ message: 'Internal Server Error' });
+    }
+  });
*** End Patch
