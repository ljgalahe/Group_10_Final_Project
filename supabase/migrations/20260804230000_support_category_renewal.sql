-- Renewal requests via customer portal use support_requests.category = 'renewal'
alter type support_category add value if not exists 'renewal';
