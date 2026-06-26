const express = require('express');
const router = express.Router();
const briefController = require('../controllers/briefController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { validateBrief } = require('../validators/briefValidator');

router.use(protect);

// Brief List and Creation
router.route('/')
  .get(briefController.getBriefs)
  .post(validateBrief, briefController.createBrief);

// Attachment deletion (independent of brief ID in URL)
router.delete('/attachments/:id', briefController.deleteAttachment);

// Brief Details, Updates, Deletions
router.route('/:id')
  .get(briefController.getBriefById)
  .put(validateBrief, briefController.updateBrief)
  .delete(briefController.deleteBrief);

// Status workflows
router.patch('/:id/status', briefController.patchBriefStatus);

// Brief uploads
router.post('/:id/attachments', upload.single('file'), briefController.uploadAttachment);

module.exports = router;
