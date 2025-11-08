import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { llmService } from '../services/llm';
import { createClient } from '@supabase/supabase-js';

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

    // Create a Supabase client with user's token for RLS
    // Use the token in the auth header for RLS policies to work
    const userSupabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    // Set the session to ensure RLS policies recognize the user
    await userSupabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    } as any);

    (req as any).user = user;
    (req as any).userSupabase = userSupabase; // Client with user context for RLS
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};

// Create travel plan
router.post('/plan', authenticate, async (req, res) => {
  try {
    const { destination, days, budget, travelers, startDate, preferences, voiceInput } = req.body;
    const user = (req as any).user;

    console.log('Creating travel plan:', { destination, days, budget, travelers, startDate, userId: user.id });

    if (!destination || !days || !budget || !travelers) {
      console.error('Missing required fields:', { destination, days, budget, travelers });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate startDate if provided
    let validStartDate = startDate;
    if (startDate) {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        console.warn('Invalid startDate provided, using today:', startDate);
        validStartDate = undefined;
      }
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
        startDate: validStartDate,
        preferences: preferences || voiceInput || undefined
      });
      console.log('LLM plan generated successfully');
    } catch (llmError: any) {
      console.error('LLM service error:', llmError);
      
      // Extract error details
      const errorMessage = llmError.message || '未知错误';
      const errorDetails = llmError.response?.data || null;
      const statusCode = llmError.response?.status || 500;
      
      // Provide user-friendly error message
      let userMessage = errorMessage;
      
      // Check for specific error cases
      if (errorMessage.includes('API访问被拒绝') || errorMessage.includes('Access denied')) {
        userMessage = 'API访问被拒绝。可能的原因：\n1. API Key无效或已过期\n2. 账户余额不足\n3. 没有权限使用该模型\n4. 账户状态异常\n\n请检查您的 DASHSCOPE_API_KEY 配置，并确保账户状态正常。';
      } else if (errorMessage.includes('API Key认证失败') || errorMessage.includes('authentication')) {
        userMessage = 'API Key认证失败。请检查您的 DASHSCOPE_API_KEY 是否正确配置在 .env 文件中。';
      } else if (errorMessage.includes('模型不存在')) {
        userMessage = '模型不存在或API端点错误。请检查模型名称和API地址配置。';
      }
      
      return res.status(statusCode).json({ 
        error: userMessage,
        details: errorDetails,
        code: statusCode
      });
    }

    // Save to database
    console.log('Saving to database...');
    // Use userSupabase client with user's token for RLS
    const userSupabase = (req as any).userSupabase || supabaseAdmin;
    const { data, error } = await userSupabase
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
    const userSupabase = (req as any).userSupabase || supabaseAdmin;

    const { data, error } = await userSupabase
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
    const userSupabase = (req as any).userSupabase || supabaseAdmin;

    const { data, error } = await userSupabase
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
    const userSupabase = (req as any).userSupabase || supabaseAdmin;

    const { data, error } = await userSupabase
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
    const userSupabase = (req as any).userSupabase || supabaseAdmin;

    const { error } = await userSupabase
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

