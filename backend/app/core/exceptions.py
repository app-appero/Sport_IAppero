class ProviderError(Exception):
    def __init__(self, provider: str, message: str, status_code: int | None = None):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ProviderUnavailable(ProviderError):
    pass


class ProviderResponseError(ProviderError):
    pass


class PredictionNotFound(Exception):
    def __init__(self, prediction_id: str):
        self.prediction_id = prediction_id
        super().__init__(f"Prediction not found: {prediction_id}")
