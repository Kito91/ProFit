const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const quizController = require('../controllers/quizController');

router.post('/answer', authMiddleware, quizController.saveAnswer);
router.get('/responses', authMiddleware, quizController.getResponses);
router.get('/sync', optionalAuth, quizController.getQuizSync);
router.post('/sync', optionalAuth, quizController.syncQuizLead);

module.exports = router;
