import { createClient } from '@supabase/supabase-js'

// Reemplaza las siguientes líneas con los datos de tu proyecto de Supabase
const supabaseUrl = 'https://hejbnelwkzhfawbttjqd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamJuZWx3a3poZmF3YnR0anFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Njk1MTMsImV4cCI6MjA3MTA0NTUxM30.eLWXU17c4o6GTQkbp8zjIw2zNPYWAqapAiA01xK20RY'

// Crea y exporta el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)