from app.services.billing import calculate_fee


def test_first_hour_is_included():
    assert calculate_fee(60)[0] == 20


def test_additional_hour_is_rounded_up():
    assert calculate_fee(61)[0] == 30
    assert calculate_fee(121)[0] == 40
