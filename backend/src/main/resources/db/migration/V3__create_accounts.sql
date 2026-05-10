create table accounts (
    id uuid primary key,
    auth_subject varchar(200) not null unique,
    email varchar(255) not null,
    display_name varchar(255) not null,
    profile varchar(20) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create index idx_accounts_profile on accounts(profile);