import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createChatHandler } from './handler.ts';

serve(createChatHandler(Deno.env.get('OPENAI_API_KEY')));
