// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

abstract contract FullMath {
    // https://xn--2-umb.com/21/muldiv/
    function muldiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            // Handle division by zero
            require(denominator > 0);

            // 512-bit multiply [prod1 prod0] = a * b
            // Compute the product mod 2**256 and mod 2**256 - 1
            // then use the Chinese Remainder Theorem to reconstruct
            // the 512 bit result. The result is stored in two 256
            // variables such that product = prod1 * 2**256 + prod0
            uint256 prod0; // Least significant 256 bits of the product
            uint256 prod1; // Most significant 256 bits of the product
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            // Short circuit 256 by 256 division
            // This saves gas when a * b is small, at the cost of making the
            // large case a bit more expensive. Depending on your use case you
            // may want to remove this short circuit and always go through the
            // 512 bit path.
            if (prod1 == 0) {
                assembly {
                    result := div(prod0, denominator)
                }
                return result;
            }

            ///////////////////////////////////////////////
            // 512 by 256 division.
            ///////////////////////////////////////////////

            // Handle overflow, the result must be < 2**256
            require(prod1 < denominator);

            // Make division exact by subtracting the remainder from [prod1 prod0]
            // Compute remainder using mulmod
            // Note mulmod(_, _, 0) == 0
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
            }
            // Subtract 256 bit number from 512 bit number
            assembly {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            // Factor powers of two out of denominator
            // Compute largest power of two divisor of denominator.
            // Always >= 1 unless denominator is zero, then twos is zero.
            uint256 twos = denominator & (~denominator + 1);
            // Divide denominator by power of two
            assembly {
                denominator := div(denominator, twos)
            }

            // Divide [prod1 prod0] by the factors of two
            assembly {
                prod0 := div(prod0, twos)
            }
            // Shift in bits from prod1 into prod0. For this we need
            // to flip `twos` such that it is 2**256 / twos.
            // If twos is zero, then it becomes one
            assembly {
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;

            // Invert denominator mod 2**256
            // Now that denominator is an odd number, it has an inverse
            // modulo 2**256 such that denominator * inv = 1 mod 2**256.
            // Compute the inverse by starting with a seed that is correct
            // correct for four bits. That is, denominator * inv = 1 mod 2**4
            // If denominator is zero the inverse starts with 2
            uint256 inv = (3 * denominator) ^ 2;
            // Now use Newton-Raphson itteration to improve the precision.
            // Thanks to Hensel's lifting lemma, this also works in modular
            // arithmetic, doubling the correct bits in each step.
            inv *= 2 - denominator * inv; // inverse mod 2**8
            inv *= 2 - denominator * inv; // inverse mod 2**16
            inv *= 2 - denominator * inv; // inverse mod 2**32
            inv *= 2 - denominator * inv; // inverse mod 2**64
            inv *= 2 - denominator * inv; // inverse mod 2**128
            inv *= 2 - denominator * inv; // inverse mod 2**256
            // If denominator is zero, inv is now 128

            // Because the division is now exact we can divide by multiplying
            // with the modular inverse of denominator. This will give us the
            // correct result modulo 2**256. Since the precoditions guarantee
            // that the outcome is less than 2**256, this is the final result.
            // We don't need to compute the high bits of the result and prod1
            // is no longer required.
            result = prod0 * inv;
            return result;
        }
    }
}

abstract contract TWAML is FullMath {
    /// @notice Compute the minimum weight to participate in the twAML voting mechanism
    /// @param _totalWeight The total weight of the twAML system
    /// @param _minWeightFactor The minimum weight factor in BPS
    function computeMinWeight(uint256 _totalWeight, uint256 _minWeightFactor) internal pure returns (uint256) {
        uint256 mul = (_totalWeight * _minWeightFactor);
        return mul >= 1e4 ? mul / 1e4 : _totalWeight;
    }

    function computeMagnitude(uint256 _timeWeight, uint256 _cumulative) internal pure returns (uint256) {
        return sqrt(_timeWeight * _timeWeight + _cumulative * _cumulative) - _cumulative;
    }

    function computeTarget(uint256 _dMin, uint256 _dMax, uint256 _magnitude, uint256 _cumulative)
        internal
        pure
        returns (uint256)
    {
        if (_cumulative == 0) {
            return _dMax;
        }
        uint256 target = (_magnitude * _dMax) / _cumulative;
        target = target > _dMax ? _dMax : target < _dMin ? _dMin : target;
        return target;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @notice Will ceil/floor the reward amount to the nearest number by increment of `_multiplier`.
     * @dev e.g: tOB: 1, multiplier: 5, cap: 2
     *           twTap: 1, multiplier: 10, cap: 5
     */
    function capCumulativeReward(uint256 _amount, uint256 _multiplier, uint256 _cap) internal pure returns (uint256) {
        uint256 remainder = _amount % _multiplier;
        if (remainder == 0) {
            return _amount;
        }
        if (remainder > _cap) {
            return _amount + _multiplier - remainder;
        }
        return _amount - remainder;
    }
}