-- ============================================================================
-- V6: Inbound Task & Operation Tracking Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS wes.wes_task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number VARCHAR(60) NOT NULL UNIQUE,
    task_type VARCHAR(40) NOT NULL DEFAULT 'INBOUND_PUTAWAY',
    pallet_lpn VARCHAR(60) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    current_operation_seq INT NOT NULL DEFAULT 1,
    source_location VARCHAR(100) NOT NULL,
    allocated_location VARCHAR(100),
    submitted_by VARCHAR(80) NOT NULL DEFAULT 'OPERATOR',
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wes_task_number ON wes.wes_task(task_number);
CREATE INDEX IF NOT EXISTS idx_wes_task_lpn ON wes.wes_task(pallet_lpn);
CREATE INDEX IF NOT EXISTS idx_wes_task_status ON wes.wes_task(status);

CREATE TABLE IF NOT EXISTS wes.task_operation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES wes.wes_task(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    handler_type VARCHAR(40) NOT NULL,            -- 'WMS', 'WCS', 'OPERATOR', 'SYSTEM'
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',-- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_result JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_task_op_seq UNIQUE (task_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_task_op_task_id ON wes.task_operation(task_id);
CREATE INDEX IF NOT EXISTS idx_task_op_status ON wes.task_operation(status);
