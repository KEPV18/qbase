-- Enable RLS and add read policies for authenticated users on risk/capa/process tables

-- risks table
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read risks"
  ON risks FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert risks"
  ON risks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update risks"
  ON risks FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- capas table
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read capas"
  ON capas FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert capas"
  ON capas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update capas"
  ON capas FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (deleted_at IS NULL);

-- processes table
ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read processes"
  ON processes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert processes"
  ON processes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update processes"
  ON processes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- process_interactions table
ALTER TABLE process_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read process_interactions"
  ON process_interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert process_interactions"
  ON process_interactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update process_interactions"
  ON process_interactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);