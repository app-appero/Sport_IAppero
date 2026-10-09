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


class EventNotFound(Exception):
    def __init__(self, event_id: str):
        self.event_id = event_id
        super().__init__(f"Event not found: {event_id}")


class SnapshotExpired(Exception):
    def __init__(self, snapshot_id: str):
        self.snapshot_id = snapshot_id
        super().__init__(f"Snapshot expired: {snapshot_id}")


class InvalidCursor(Exception):
    def __init__(self, message: str = "Invalid cursor"):
        super().__init__(message)
