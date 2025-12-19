class Storage:
    name = None

    def save(self, **kwargs):
        raise NotImplementedError()

    def get(self, **kwargs):
        raise NotImplementedError()