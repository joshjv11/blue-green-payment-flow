-- Enable RLS on indian_states table
ALTER TABLE public.indian_states ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read states
CREATE POLICY "Everyone can view Indian states"
  ON public.indian_states FOR SELECT
  USING (true);