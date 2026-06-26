const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// These will be mounted at /api/briefs in app.js, resulting in:
// GET /api/briefs/:id/comments
// POST /api/briefs/:id/comments
router.route('/:id/comments')
  .get(commentController.getComments)
  .post(commentController.createComment);

// Independent comment actions (mounted at /api/comments in app.js, or similar)
// Let's declare them here and we can handle them
// PUT /api/briefs/comments/:id
// DELETE /api/briefs/comments/:id
router.route('/comments/:id')
  .put(commentController.updateComment)
  .delete(commentController.deleteComment);

router.route('/comments/:id/react')
  .post(commentController.reactToComment);

module.exports = router;
