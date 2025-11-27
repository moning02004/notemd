class NotExistsToken(Exception):

    def __init__(self, message="Token does not exist"):
        self.message = message
        super().__init__(self.message)