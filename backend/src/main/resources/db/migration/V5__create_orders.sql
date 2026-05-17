create table orders (
    id uuid primary key,
    customer_id uuid not null,
    establishment_id uuid not null,
    status varchar(50) not null,
    payment_method varchar(50) not null,
    change_required boolean not null,
    subtotal_amount numeric(10, 2) not null,
    total_amount numeric(10, 2) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_orders_customer
        foreign key (customer_id)
        references accounts(id),
    constraint fk_orders_establishment
        foreign key (establishment_id)
        references establishments(id)
);

create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_establishment_id on orders(establishment_id);

create table order_items (
    id uuid primary key,
    order_id uuid not null,
    product_id uuid not null,
    product_name varchar(255) not null,
    unit_price numeric(10, 2) not null,
    quantity integer not null,
    line_total numeric(10, 2) not null,
    constraint fk_order_items_order
        foreign key (order_id)
        references orders(id)
        on delete cascade,
    constraint fk_order_items_product
        foreign key (product_id)
        references products(id)
);

create index idx_order_items_order_id on order_items(order_id);
create index idx_order_items_product_id on order_items(product_id);