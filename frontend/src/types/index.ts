export interface Worker {
  worker_id: string
  region: string
  lat: number
  lng: number
  status: 'active' | 'idle' | 'offline'
  cpu_cores: number
  reputation: number
  credits: number
  jobs_completed: number
}

export interface Job {
  job_id: string
  texts: string[]
  status: 'queued' | 'processing' | 'complete'
  chunks_total: number
  chunks_complete: number
  cost_usd: number
  created_at: string
  assigned_worker_id?: string
}

export interface Chunk {
  chunk_id: string
  job_id: string
  worker_id: string
  embeddings: number[][]
  cpu_seconds: number
  verified: boolean
}

export interface ActivityEvent {
  timestamp: string
  message: string
  earned: number
}

export interface VerificationRequest {
  job_id: string
  company: string
  chunks: number
  reward_usd: number
  description: string
}
