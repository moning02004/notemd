class Storage:
    name = None

    def save(self, **kwargs):
        raise NotImplementedError()

    def get(self, **kwargs):
        raise NotImplementedError()

    def read(self, name: str) -> bytes | None:
        """저장해 둔 파일(업로드 주소의 마지막 조각, 예: 'ab12….png')의 바이트. 없으면 None.

        PDF 로 내보낼 때 본문의 이미지를 여기서 받아 넣는다. 로컬 디스크든 MinIO·S3 든
        이 메서드만 채우면 PDF 에도 이미지가 따라간다.
        """
        raise NotImplementedError()
