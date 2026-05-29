create table customer_addresses (
    id uuid primary key,
    account_id uuid not null references accounts(id) on delete cascade,
    label varchar(255),
    default_address boolean not null default false,
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

create index idx_customer_addresses_account_id on customer_addresses(account_id);

create unique index uk_customer_addresses_default_per_account
    on customer_addresses(account_id)
    where default_address = true;