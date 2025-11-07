import express from 'express';
import { supabase } from '../config/supabase';
import { llmService } from '../services/llm';

const router = express.Router();

// Middleware to verify authentication
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    (req as any).user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

// Create travel plan
router.post('/plan', authenticate, async (req, res) => {
  try {
    const { destination, days, budget, travelers, preferences, voiceInput } = req.body;
    const user = (req as any).user;

    console.log('Creating travel plan:', { destination, days, budget, travelers, userId: user.id });

    if (!destination || !days || !budget || !travelers) {
      console.error('Missing required fields:', { destination, days, budget, travelers });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate travel plan using LLM
    console.log('Calling LLM service...');
    let plan;
    try {
      plan = await llmService.generateTravelPlan({
        destination,
        days: parseInt(days),
        budget: parseFloat(budget),
        travelers: parseInt(travelers),
        preferences: preferences || voiceInput || undefined
      });
      console.log('LLM plan generated successfully');
    } catch (llmError: any) {
      console.error('LLM service error:', llmError);
      return res.status(500).json({ 
        error: 'Failed to generate travel plan: ' + (llmError.message || 'Unknown error'),
        details: llmError.response?.data || null
      });
    }

    // Save to database
    console.log('Saving to database...');
    const { data, error } = await supabase
      .from('travel_plans')
      .insert({
        user_id: user.id,
        destination,
        days: parseInt(days),
        budget: parseFloat(budget),
        travelers: parseInt(travelers),
        preferences: preferences || voiceInput || null,
        plan_data: plan,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: 'Failed to save travel plan',
        details: error.message || error
      });
    }

    console.log('Travel plan created successfully:', data.id);
    res.json({ plan: data, message: 'Travel plan created successfully' });
  } catch (error: any) {
    console.error('Unexpected error creating travel plan:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all travel plans for user
router.get('/plans', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;

    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ plans: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single travel plan
router.get('/plans/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Travel plan not found' });
    }

    res.json({ plan: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update travel plan
router.put('/plans/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('travel_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Travel plan not found or update failed' });
    }

    res.json({ plan: data, message: 'Travel plan updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete travel plan
router.delete('/plans/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const { error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Travel plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Estimate budget
router.post('/estimate-budget', authenticate, async (req, res) => {
  try {
    const { destination, days, travelers, preferences } = req.body;

    if (!destination || !days || !travelers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const estimatedBudget = await llmService.estimateBudget(
      destination,
      parseInt(days),
      parseInt(travelers),
      preferences
    );

    res.json({ estimatedBudget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

