-- Sub-channels for Card
INSERT INTO payment_sub_channels (method_code, code, label, icon)
VALUES
('card', 'visa', 'Visa', '/uploads/payment-icons/visa.png'),
('card', 'mastercard', 'MasterCard', '/uploads/payment-icons/mastercard.png'),
('card', 'verve', 'Verve', '/uploads/payment-icons/verve.png')
ON CONFLICT (method_code, code) DO NOTHING;

-- Sub-channels for Mobile Money
INSERT INTO payment_sub_channels (method_code, code, label, icon)
VALUES
('momo', 'mtn', 'MTN MoMo', '/uploads/payment-icons/mtn.png'),
('momo', 'vodafone', 'Vodafone Cash', '/uploads/payment-icons/vodafone.png'),
('momo', 'airteltigo', 'AirtelTigo Money', '/uploads/payment-icons/airteltigo.png'),
('momo', 'telecel', 'Telecel Cash', '/uploads/payment-icons/telecel.png')
ON CONFLICT (method_code, code) DO NOTHING;

-- Sub-channels for Cash on Delivery
INSERT INTO payment_sub_channels (method_code, code, label, icon)
VALUES
('cod', 'pickup', 'Cash On Delivery/Pickup', '/uploads/payment-icons/cash.png')
ON CONFLICT (method_code, code) DO NOTHING;
