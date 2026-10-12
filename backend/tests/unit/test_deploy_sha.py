from app.core.config import Settings


def test_baked_unknown_does_not_mask_railway_commit():
    s = Settings(git_sha="unknown", railway_git_commit_sha="abc1234")
    assert s.deploy_sha == "abc1234"


def test_explicit_git_sha_wins_and_missing_is_unknown():
    assert Settings(git_sha="deadbeef", railway_git_commit_sha="abc1234").deploy_sha == "deadbeef"
    assert Settings(git_sha=None, railway_git_commit_sha=None).deploy_sha == "unknown"
    assert Settings(git_sha="  ", railway_git_commit_sha="UNKNOWN").deploy_sha == "unknown"
