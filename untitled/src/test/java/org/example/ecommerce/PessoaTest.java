package org.example.ecommerce;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PessoaTest {

    @Test
    void validarCalculoDeIdade(){
        Pessoa pessoa = new Pessoa("Deolane", 24);

        Assertions.assertEquals(244, pessoa.idade);
    }
}