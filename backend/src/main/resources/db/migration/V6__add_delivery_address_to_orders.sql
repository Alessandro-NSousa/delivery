alter table orders
    add column delivery_zip_code varchar(8),
    add column delivery_street varchar(255),
    add column delivery_street_number varchar(20),
    add column delivery_district varchar(255),
    add column delivery_city varchar(255),
    add column delivery_state varchar(2),
    add column delivery_complement varchar(255);