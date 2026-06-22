package com.solchall.todai.domain.elder.repository;

import com.solchall.todai.domain.elder.entity.Elder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ElderRepository extends JpaRepository<Elder, Long> {

    List<Elder> findAllByOrderByIdAsc();
}
