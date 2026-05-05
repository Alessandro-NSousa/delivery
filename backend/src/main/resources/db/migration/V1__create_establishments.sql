create table if not exists establishments (
    id uuid primary key,
    trade_name varchar(255) not null,
    corporate_name varchar(255) not null,
    cnpj varchar(14) not null unique,
    phone varchar(255) not null,
    email varchar(255) not null,
    category varchar(50) not null,
    opening_hours varchar(255) not null,
    zip_code varchar(8) not null,
    street varchar(255) not null,
    street_number varchar(20) not null,
    district varchar(255) not null,
    city varchar(255) not null,
    state varchar(2) not null,
    complement varchar(255),
    created_at timestamptz not null,
    updated_at timestamptz not null
);