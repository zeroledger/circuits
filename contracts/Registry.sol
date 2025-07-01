// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

contract EncryptionRegistry {
    struct EncryptionPubKey {
        bytes pubKey;
        bool active;
    }

    mapping(address => EncryptionPubKey) public encryptionPubKeys;

    event EncryptionPubKeySet(address indexed user, bytes encryptionPubKey);

    function register(bytes calldata encryptionPubKey) external {
        require(encryptionPubKeys[msg.sender].active == false, "EncryptionRegistry: Encryption key already set");
        encryptionPubKeys[msg.sender] = EncryptionPubKey({
            pubKey: encryptionPubKey,
            active: true
        });
        emit EncryptionPubKeySet(msg.sender, encryptionPubKey);
    }

    function getEncryptionPubKey(address user) external view returns (bytes memory) {
        return encryptionPubKeys[user].pubKey;
    }
}
