package com.delivery.establishment.application;

import java.util.Locale;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import com.delivery.account.application.CurrentAccountService;
import com.delivery.account.domain.Account;
import com.delivery.establishment.api.AddressRequest;
import com.delivery.establishment.api.CreateEstablishmentRequest;
import com.delivery.establishment.api.EstablishmentResponse;
import com.delivery.establishment.domain.Address;
import com.delivery.establishment.domain.Establishment;
import com.delivery.establishment.infrastructure.EstablishmentRepository;
import com.delivery.shared.domain.BusinessException;

import jakarta.transaction.Transactional;

@Service
@Validated
public class EstablishmentService {

    private final EstablishmentRepository establishmentRepository;
    private final CurrentAccountService currentAccountService;

    public EstablishmentService(
        EstablishmentRepository establishmentRepository,
        CurrentAccountService currentAccountService
    ) {
        this.establishmentRepository = establishmentRepository;
        this.currentAccountService = currentAccountService;
    }

    @Transactional
    public EstablishmentResponse create(CreateEstablishmentRequest request) {
        Account owner = currentAccountService.requireMerchant();

        if (establishmentRepository.existsByCnpj(request.cnpj())) {
            throw new BusinessException("Ja existe um estabelecimento cadastrado com este CNPJ");
        }

        Establishment establishment = new Establishment(
            owner,
            request.tradeName(),
            request.corporateName(),
            request.cnpj(),
            request.phone(),
            request.email(),
            request.category(),
            request.openingHours(),
            toAddress(request.address())
        );

        try {
            return EstablishmentResponse.from(establishmentRepository.saveAndFlush(establishment));
        } catch (DataIntegrityViolationException ex) {
            if (isDuplicatedCnpjViolation(ex)) {
                throw new BusinessException("Ja existe um estabelecimento cadastrado com este CNPJ");
            }

            throw ex;
        }
    }

    @Transactional
    public List<EstablishmentResponse> listAll() {
        return establishmentRepository.findAll().stream().map(EstablishmentResponse::from).toList();
    }

    @Transactional
    public List<EstablishmentResponse> listMine() {
        Account currentAccount = currentAccountService.requireMerchant();
        return establishmentRepository.findAllByOwnerIdOrderByTradeNameAsc(currentAccount.getId()).stream()
            .map(EstablishmentResponse::from)
            .toList();
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

    private boolean isDuplicatedCnpjViolation(DataIntegrityViolationException ex) {
        Throwable mostSpecificCause = ex.getMostSpecificCause();
        String message = mostSpecificCause != null ? mostSpecificCause.getMessage() : ex.getMessage();

        if (message == null || message.isBlank()) {
            return false;
        }

        String normalizedMessage = message.toLowerCase(Locale.ROOT);
        return normalizedMessage.contains("establishments_cnpj_key")
            || (normalizedMessage.contains("cnpj")
                && (normalizedMessage.contains("duplicate")
                    || normalizedMessage.contains("duplic")
                    || normalizedMessage.contains("unique")
                    || normalizedMessage.contains("uniq")));
    }
}