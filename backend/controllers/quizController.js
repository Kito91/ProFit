const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.saveAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { question, answer, current_step, is_complete } = req.body;

    if (!question || answer === undefined) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    // Upsert quiz response
    await db.query(`
      INSERT INTO quiz_responses (id, user_id, question, answer, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, question)
      DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
    `, [uuidv4(), userId, question, JSON.stringify(answer)]);

    // Upsert user progress
    if (current_step !== undefined) {
      await db.query(`
        INSERT INTO user_progress (user_id, current_step, is_complete, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET 
          current_step = EXCLUDED.current_step, 
          is_complete = EXCLUDED.is_complete,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, current_step, is_complete || false]);
    }

    res.json({ message: 'Answer saved successfully' });
  } catch (error) {
    console.error('Error saving quiz answer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getResponses = async (req, res) => {
  try {
    const userId = req.user.id;

    const responsesQuery = await db.query(
      'SELECT question, answer FROM quiz_responses WHERE user_id = $1',
      [userId]
    );

    const progressQuery = await db.query(
      'SELECT current_step, is_complete FROM user_progress WHERE user_id = $1',
      [userId]
    );

    const progress = progressQuery.rows.length > 0 ? progressQuery.rows[0] : null;

    res.json({
      responses: responsesQuery.rows.map(r => ({ question: r.question, answer: r.answer })),
      progress: progress || { current_step: null, is_complete: false }
    });
  } catch (error) {
    console.error('Error fetching quiz responses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getQuizSync = async (req, res) => {
  try {
    let lead = null;

    if (req.user?.email) {
      const result = await db.query(
        'SELECT id, email, name, responses, current_step, is_completed, last_active_at FROM quiz_leads WHERE email = $1 ORDER BY last_active_at DESC LIMIT 1',
        [req.user.email]
      );
      lead = result.rows[0] || null;
    }

    res.json({ lead: lead || null });
  } catch (error) {
    console.error('Error getting quiz sync:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.syncQuizLead = async (req, res) => {
  const { id, email, name, responses, current_step, is_completed } = req.body;

  if (!id) return res.status(400).json({ message: 'Lead ID is required' });

  try {
    const result = await db.query(`
      INSERT INTO quiz_leads (id, email, name, responses, current_step, is_completed, last_active_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (id)
      DO UPDATE SET
        email = COALESCE(EXCLUDED.email, quiz_leads.email),
        name = COALESCE(EXCLUDED.name, quiz_leads.name),
        responses = EXCLUDED.responses,
        current_step = EXCLUDED.current_step,
        is_completed = EXCLUDED.is_completed,
        last_active_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [id, email || null, name || null, JSON.stringify(responses || {}), current_step || 1, is_completed ?? false]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error syncing quiz lead:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
