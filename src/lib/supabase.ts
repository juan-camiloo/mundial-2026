
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fztiwrorpjthqbmujcun.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6dGl3cm9ycGp0aHFibXVqY3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODU5OTUsImV4cCI6MjA5MDU2MTk5NX0.TOPE0h7MfAcXmlSyCcQzYvfq_q0Y7ioHfeg9UxtZXzc'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth:{ 
        flowType: 'pkce',
    }
})