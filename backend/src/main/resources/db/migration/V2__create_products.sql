create table if not exists products (
    id uuid primary key,
    establishment_id uuid not null,
    name varchar(255) not null,
    description varchar(1000) not null,
    category varchar(50) not null,
    price numeric(10, 2) not null,
    image_url varchar(500) not null,
    available boolean not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_products_establishment
        foreign key (establishment_id)
        references establishments (id)
        on delete cascade
);

create index if not exists idx_products_establishment_id on products (establishment_id);