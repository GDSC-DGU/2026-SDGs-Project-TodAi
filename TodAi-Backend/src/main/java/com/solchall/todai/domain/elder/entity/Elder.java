package com.solchall.todai.domain.elder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "elder")
public class Elder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    private Integer age;

    @Enumerated(EnumType.STRING)
    private ElderGender gender;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(name = "detail_address", length = 255)
    private String detailAddress;

    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'NO_DATA'")
    private ElderStatus status = ElderStatus.NO_DATA;

    protected Elder() {
    }

    public Elder(
            String name,
            LocalDate birthDate,
            Integer age,
            ElderGender gender,
            String phone,
            String address,
            String detailAddress,
            String emergencyContactName,
            String emergencyContactPhone,
            String profileImageUrl,
            ElderStatus status
    ) {
        this.name = name;
        this.birthDate = birthDate;
        this.age = age;
        this.gender = gender;
        this.phone = phone;
        this.address = address;
        this.detailAddress = detailAddress;
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.profileImageUrl = profileImageUrl;
        this.status = status == null ? ElderStatus.NO_DATA : status;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public Integer getAge() {
        return age;
    }

    public ElderGender getGender() {
        return gender;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public String getDetailAddress() {
        return detailAddress;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public ElderStatus getStatus() {
        return status;
    }
}
