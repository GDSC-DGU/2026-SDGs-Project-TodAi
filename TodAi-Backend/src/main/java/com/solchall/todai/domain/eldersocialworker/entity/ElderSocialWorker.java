package com.solchall.todai.domain.eldersocialworker.entity;

import com.solchall.todai.domain.elder.entity.Elder;
import com.solchall.todai.domain.socialworker.entity.SocialWorker;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "elder_social_worker",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_elder_social_worker_pair",
                        columnNames = {"elder_id", "social_worker_id"}
                )
        }
)
public class ElderSocialWorker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "elder_id", nullable = false)
    private Elder elder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "social_worker_id", nullable = false)
    private SocialWorker socialWorker;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;

    protected ElderSocialWorker() {
    }

    public ElderSocialWorker(Elder elder, SocialWorker socialWorker, boolean primary) {
        this.elder = elder;
        this.socialWorker = socialWorker;
        this.primary = primary;
    }

    public Long getId() {
        return id;
    }

    public Elder getElder() {
        return elder;
    }

    public SocialWorker getSocialWorker() {
        return socialWorker;
    }

    public boolean isPrimary() {
        return primary;
    }
}
