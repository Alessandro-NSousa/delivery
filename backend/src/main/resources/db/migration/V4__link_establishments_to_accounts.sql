alter table establishments add column owner_id uuid;

alter table establishments
    add constraint fk_establishments_owner
    foreign key (owner_id)
    references accounts(id);

create index idx_establishments_owner_id on establishments(owner_id);