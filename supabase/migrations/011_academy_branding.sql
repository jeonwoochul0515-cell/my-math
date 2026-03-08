-- 학원 화이트라벨: 로고 URL 컬럼 추가
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Supabase Storage 버킷: 학원 로고 저장용
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-logos', 'academy-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 정책: 학원 소유자만 자기 폴더에 업로드/삭제 가능
CREATE POLICY "학원 소유자 로고 업로드"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'academy-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "학원 소유자 로고 수정"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'academy-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "학원 소유자 로고 삭제"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'academy-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 로고 이미지는 공개 접근 허용 (시험지, PWA에서 사용)
CREATE POLICY "로고 공개 읽기"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'academy-logos');
