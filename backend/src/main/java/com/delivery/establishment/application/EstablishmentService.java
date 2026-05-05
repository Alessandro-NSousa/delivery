package com.delivery.establishment.application;

import java.util.List;

import com.delivery.establishment.api.AddressRequest;
import com.delivery.establishment.api.CreateEstablishmentRequest;
import com.delivery.establishment.api.EstablishmentResponse;
import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.infrastructure.EstablishmentRepository;
import com.delivery.shared.domain.BusinessException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
public class EstablishmentService {

    private final EstablishmentRepository establishmentRepository;

    public EstablishmentService(EstablishmentRepository establishmentRepository) {
        this.establishmentRepository = establishmentRepository;
    }

    @Transactional
    public EstablishmentResponse create(CreateEstablishmentRequest request) {
        if (establishmentRepository.existsByCnpj(request.cnpj())) {
            throw new BusinessException("Ja existe um estabelecimento cadastrado com este CNPJ");
        }

        Establishment establishment = new Establishment(
            request.tradeName(),
            request.corporateName(),
            request.cnpj(),
            request.phone(),
            request.email(),
            request.category(),
            request.openingHours(),
            toAddress(request.address())
        );

        return EstablishmentResponse.from(establishmentRepository.save(establishment));
    }

    @Transactional
    public List<EstablishmentResponse> listAll() {
        return establishmentRepository.findAll().stream().map(EstablishmentResponse::from).toList();
    }

    private Address toAddress(AddressRequest request) {
        return new Address(
            request.zipCode(),
            request.street(),
            request.number(),
            request.district(),
            request.city(),
            request.state(),
            request.complement()
        );
    }
}