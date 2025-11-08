import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
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

// Add expense
router.post('/expenses', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { travel_plan_id, category, amount, description, date, voiceInput } = req.body;

    if (!travel_plan_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userSupabase = (req as any).userSupabase || supabaseAdmin;
    const { data, error } = await userSupabase
      .from('expenses')
      .insert({
        user_id: user.id,
        travel_plan_id,
        category: category || 'other',
        amount: parseFloat(amount),
        description: description || voiceInput || null,
        date: date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ expense: data, message: 'Expense added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get expenses for a travel plan
router.get('/expenses/:travelPlanId', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { travelPlanId } = req.params;

    const userSupabase = (req as any).userSupabase || supabaseAdmin;
    const { data, error } = await userSupabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('travel_plan_id', travelPlanId)
      .order('date', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Calculate totals
    interface Expense {
      id?: string;
      user_id?: string;
      travel_plan_id?: string;
      category?: string;
      amount?: number;
      description?: string;
      date?: string;
      created_at?: string;
    }
    
    const expenses: Expense[] = (data || []) as Expense[];
    const total = expenses.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);
    const byCategory = expenses.reduce((acc: Record<string, number>, expense: Expense) => {
      const cat = expense.category || 'other';
      acc[cat] = (acc[cat] || 0) + (expense.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    res.json({
      expenses: data || [],
      summary: {
        total,
        byCategory,
        count: (data || []).length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update expense
router.put('/expenses/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;

    const userSupabase = (req as any).userSupabase || supabaseAdmin;
    const { data, error } = await userSupabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Expense not found or update failed' });
    }

    res.json({ expense: data, message: 'Expense updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete expense
router.delete('/expenses/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const userSupabase = (req as any).userSupabase || supabaseAdmin;
    const { error } = await userSupabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

